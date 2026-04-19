import { readFileSync, statSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execSync } from "child_process";
import { PDFParse } from "pdf-parse";
import { SYSTEM_PROMPT } from "../prompts/system";
import { CLASSIFY_PROMPT } from "../prompts/classify";
import { INSURANCE_CERT_PROMPT } from "../prompts/insurance-cert";
import { TRANSPORT_LICENSE_PROMPT } from "../prompts/transport-license";
import { LETTERHEAD_PROMPT } from "../prompts/letterhead";
import { FREIGHT_PROFILE_PROMPT } from "../prompts/freight-profile";
import { COMMUNICATION_PROMPT } from "../prompts/communication";
import { DRIVER_VEHICLE_PROMPT } from "../prompts/driver-vehicle";
import { getAzureClient, ANALYSIS_DEPLOYMENT } from "@/lib/azure-openai";
import type {
  AnalysisProvider,
  ProviderResult,
  ExtractionResult,
  RiskSignal,
} from "./types";

const prompts: Record<string, string> = {
  "insurance-cert": INSURANCE_CERT_PROMPT,
  "transport-license": TRANSPORT_LICENSE_PROMPT,
  letterhead: LETTERHEAD_PROMPT,
  "freight-profile": FREIGHT_PROFILE_PROMPT,
  communication: COMMUNICATION_PROMPT,
  "driver-vehicle": DRIVER_VEHICLE_PROMPT,
};

export const CLASSIFY_TIMEOUT_MS = 90000;
export const ANALYSIS_TIMEOUT_MS = 180000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label}: Zeitüberschreitung nach ${ms / 1000}s`)),
        ms
      )
    ),
  ]);
}

function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.endsWith(".pdf");
}

function normalizeImageMime(mimeType: string): string {
  if (mimeType === "image/jpg") return "image/jpeg";
  return mimeType;
}

const PDF_SIZE_THRESHOLD_KB = 100;
const RASTER_DPI = 150;
const RASTER_MAX_PAGES = 3;

export async function extractPdfText(
  filePath: string,
  maxPages: number = 5
): Promise<string | null> {
  const parser = new PDFParse({ data: readFileSync(filePath), verbosity: 0 });
  try {
    const result = await parser.getText({ first: maxPages });
    const text = result.text?.trim();
    if (!text || text.length < 100) return null;
    console.log(
      `[pdf-text] Extracted ${text.length} chars from ${result.total} pages (limit ${maxPages})`
    );
    return text;
  } catch (err) {
    console.log(`[pdf-text] pdf-parse failed: ${err}`);
    return null;
  } finally {
    await parser.destroy();
  }
}

function rasterizePdf(
  filePath: string,
  dpi: number = RASTER_DPI,
  maxPages: number = RASTER_MAX_PAGES
): { dir: string; files: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "fc-pdf-"));
  const prefix = join(dir, "page");
  try {
    execSync(
      `pdftoppm -jpeg -r ${dpi} -f 1 -l ${maxPages} "${filePath.replace(/"/g, '\\"')}" "${prefix}"`,
      { timeout: 15000 }
    );
    const files: string[] = [];
    for (let i = 1; i <= maxPages; i++) {
      const f = `${prefix}-${i}.jpg`;
      try {
        statSync(f);
        files.push(f);
      } catch {
        break;
      }
    }
    if (files.length === 0) {
      throw new Error("pdftoppm produced no output files");
    }
    return { dir, files };
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }
}

type ImageContent = { type: "image_url"; image_url: { url: string } };
type TextContent = { type: "text"; text: string };
type UserContent = ImageContent | TextContent;

async function buildSmartContent(
  filePath: string,
  mimeType: string
): Promise<{ content: UserContent[]; cleanup?: () => void }> {
  const fileSizeKB = statSync(filePath).size / 1024;

  if (isPdf(mimeType)) {
    if (fileSizeKB > PDF_SIZE_THRESHOLD_KB) {
      const text = await extractPdfText(filePath, 5);
      if (text) {
        console.log(
          `[smart-content] Text-extraction for ${Math.round(fileSizeKB)}KB PDF (${text.length} chars, ~${Math.round(text.length / 4)} tokens)`
        );
        return {
          content: [
            { type: "text", text: `[Dokumentinhalt - Erste Seiten]\n\n${text}` },
          ],
        };
      }
    }
    const { dir, files } = rasterizePdf(filePath);
    const blocks: UserContent[] = files.map((p) => {
      const b64 = readFileSync(p).toString("base64");
      return {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${b64}` },
      };
    });
    console.log(
      `[smart-content] Rasterized ${Math.round(fileSizeKB)}KB PDF to ${files.length} JPEG(s) @${RASTER_DPI}dpi`
    );
    return {
      content: blocks,
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    };
  }

  const b64 = readFileSync(filePath).toString("base64");
  return {
    content: [
      {
        type: "image_url",
        image_url: {
          url: `data:${normalizeImageMime(mimeType)};base64,${b64}`,
        },
      },
    ],
  };
}

function buildGenericPrompt(documentType: string): string {
  return `Analysiere dieses Dokument vom Typ "${documentType}" eines Frachtführers.

Extrahiere alle relevanten Felder und prüfe auf Risikosignale.

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {},
  "confidence": 0.0-1.0,
  "missingFields": [],
  "riskSignals": [],
  "summary": "Kurze Zusammenfassung auf Deutsch"
}`;
}

function getAnalysisPrompt(documentType: string): string {
  return prompts[documentType] || buildGenericPrompt(documentType);
}

function parseJsonResponse(text: string): Record<string, unknown> {
  const match = text.match(/{[\s\S]*}/);
  if (!match) {
    throw new Error("No JSON object found in response");
  }
  return JSON.parse(match[0]) as Record<string, unknown>;
}

export async function classifyDocument(
  documentPath: string,
  mimeType: string
): Promise<{
  documentType: string;
  confidence: number;
  reasoning: string;
  timing: {
    fileReadMs: number;
    fileSizeKB: number;
    apiCallMs: number;
    totalMs: number;
  };
}> {
  const totalStart = Date.now();

  const readStart = Date.now();
  const fileSizeKB = Math.round(statSync(documentPath).size / 1024);
  const { content, cleanup } = await buildSmartContent(documentPath, mimeType);
  const fileReadMs = Date.now() - readStart;

  console.log(
    `[classify] File: ${documentPath}, Size: ${fileSizeKB}KB, Prep: ${fileReadMs}ms`
  );

  try {
    const apiStart = Date.now();
    const response = await withTimeout(
      getAzureClient().chat.completions.create({
        model: ANALYSIS_DEPLOYMENT,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [...content, { type: "text", text: CLASSIFY_PROMPT }],
          },
        ],
        max_completion_tokens: 1024,
        temperature: 0,
      }),
      CLASSIFY_TIMEOUT_MS,
      `Dokumentklassifizierung (${fileSizeKB}KB)`
    );
    const apiCallMs = Date.now() - apiStart;

    const msg = response.choices[0]?.message?.content;
    if (!msg) {
      throw new Error("No text response from classification");
    }

    console.log(
      `[classify] API: ${apiCallMs}ms, Tokens in/out: ${response.usage?.prompt_tokens}/${response.usage?.completion_tokens}`
    );

    const parsed = parseJsonResponse(msg);
    const totalMs = Date.now() - totalStart;
    console.log(
      `[classify] Total: ${totalMs}ms, Result: ${parsed.documentType}`
    );

    return {
      documentType: (parsed.documentType as string) || "unknown",
      confidence: (parsed.confidence as number) || 0,
      reasoning: (parsed.reasoning as string) || "",
      timing: { fileReadMs, fileSizeKB, apiCallMs, totalMs },
    };
  } finally {
    cleanup?.();
  }
}

export const azureDocumentProvider: AnalysisProvider = {
  id: "azure-document",
  name: "Azure OpenAI Document Analysis",

  async analyze(
    documentPath: string,
    documentType: string,
    mimeType: string,
    carrierInfo: { name: string; country?: string; vatId?: string }
  ): Promise<ProviderResult> {
    const totalStart = Date.now();

    const fileSizeKB = Math.round(statSync(documentPath).size / 1024);
    const { content, cleanup } = await buildSmartContent(documentPath, mimeType);
    const prompt = getAnalysisPrompt(documentType);

    const carrierContext = `\n\nKONTEXT zum Frachtführer:\n- Name: ${carrierInfo.name}${carrierInfo.country ? `\n- Land: ${carrierInfo.country}` : ""}${carrierInfo.vatId ? `\n- USt-IdNr: ${carrierInfo.vatId}` : ""}`;

    console.log(
      `[analyze] File: ${documentPath}, Size: ${fileSizeKB}KB, Type: ${documentType}, Timeout: ${ANALYSIS_TIMEOUT_MS / 1000}s`
    );

    try {
      const apiStart = Date.now();
      const response = await withTimeout(
        getAzureClient().chat.completions.create({
          model: ANALYSIS_DEPLOYMENT,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                ...content,
                { type: "text", text: prompt + carrierContext },
              ],
            },
          ],
          max_completion_tokens: 4096,
          temperature: 0,
        }),
        ANALYSIS_TIMEOUT_MS,
        `Dokumentanalyse (${fileSizeKB}KB, ${documentType})`
      );
      const apiCallMs = Date.now() - apiStart;

      const rawResponse = response.choices[0]?.message?.content;
      if (!rawResponse) {
        throw new Error("No text response from analysis");
      }

      console.log(
        `[analyze] API: ${apiCallMs}ms, Tokens in/out: ${response.usage?.prompt_tokens}/${response.usage?.completion_tokens}`
      );

      const totalMs = Date.now() - totalStart;
      console.log(`[analyze] Total: ${totalMs}ms`);

      const parsed = parseJsonResponse(rawResponse);

      const fields = (parsed.fields as Record<string, unknown>) || {};
      const confidence = (parsed.confidence as number) || 0;
      const missingFields = (parsed.missingFields as string[]) || [];
      const rawSignals =
        (parsed.riskSignals as Array<Record<string, unknown>>) || [];

      const riskSignals: RiskSignal[] = rawSignals.map((s) => ({
        severity: (s.severity as "critical" | "major" | "minor") || "minor",
        rule: (s.rule as string) || "unknown",
        description: (s.description as string) || "",
        field: s.field as string | undefined,
        points: (s.points as number) || 0,
      }));

      const extraction: ExtractionResult = {
        fields,
        confidence,
        riskSignals,
        missingFields,
      };

      return {
        providerId: "azure-document",
        documentType,
        extraction,
        rawResponse,
      };
    } finally {
      cleanup?.();
    }
  },
};

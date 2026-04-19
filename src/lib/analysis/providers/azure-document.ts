import { extractText } from "unpdf";
import { SYSTEM_PROMPT } from "../prompts/system";
import { CLASSIFY_PROMPT } from "../prompts/classify";
import { INSURANCE_CERT_PROMPT } from "../prompts/insurance-cert";
import { TRANSPORT_LICENSE_PROMPT } from "../prompts/transport-license";
import { LETTERHEAD_PROMPT } from "../prompts/letterhead";
import { FREIGHT_PROFILE_PROMPT } from "../prompts/freight-profile";
import { COMMUNICATION_PROMPT } from "../prompts/communication";
import { DRIVER_VEHICLE_PROMPT } from "../prompts/driver-vehicle";
import { getAzureClient, ANALYSIS_DEPLOYMENT } from "@/lib/azure-openai";
import { getStorage } from "@/lib/storage";
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

export async function extractPdfText(
  buffer: Buffer,
  maxPages: number = 5
): Promise<string | null> {
  try {
    const result = await extractText(new Uint8Array(buffer), {
      mergePages: false,
    });
    const firstPages = result.text.slice(0, maxPages);
    const text = firstPages.join("\n\n").trim();
    if (!text || text.length < 100) return null;
    console.log(
      `[pdf-text] Extracted ${text.length} chars from ${result.totalPages} pages (limit ${maxPages})`
    );
    return text;
  } catch (err) {
    console.log(`[pdf-text] unpdf failed: ${err}`);
    return null;
  }
}

type ImageContent = { type: "image_url"; image_url: { url: string } };
type TextContent = { type: "text"; text: string };
type UserContent = ImageContent | TextContent;

async function buildSmartContent(
  buffer: Buffer,
  mimeType: string
): Promise<{ content: UserContent[] }> {
  if (isPdf(mimeType)) {
    const text = await extractPdfText(buffer, 5);
    if (text) {
      return {
        content: [
          { type: "text", text: `[Dokumentinhalt - Erste Seiten]\n\n${text}` },
        ],
      };
    }
    throw new Error(
      "PDF-Textextraktion fehlgeschlagen. Bitte Dokument als Bild hochladen."
    );
  }

  const b64 = buffer.toString("base64");
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
  const storage = getStorage();
  const buffer = await storage.get(documentPath);
  const fileSizeKB = Math.round(buffer.length / 1024);
  const { content } = await buildSmartContent(buffer, mimeType);
  const fileReadMs = Date.now() - readStart;

  console.log(
    `[classify] File: ${documentPath}, Size: ${fileSizeKB}KB, Prep: ${fileReadMs}ms`
  );

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

    const storage = getStorage();
    const buffer = await storage.get(documentPath);
    const fileSizeKB = Math.round(buffer.length / 1024);
    const { content } = await buildSmartContent(buffer, mimeType);
    const prompt = getAnalysisPrompt(documentType);

    const carrierContext = `\n\nKONTEXT zum Frachtführer:\n- Name: ${carrierInfo.name}${carrierInfo.country ? `\n- Land: ${carrierInfo.country}` : ""}${carrierInfo.vatId ? `\n- USt-IdNr: ${carrierInfo.vatId}` : ""}`;

    console.log(
      `[analyze] File: ${documentPath}, Size: ${fileSizeKB}KB, Type: ${documentType}, Timeout: ${ANALYSIS_TIMEOUT_MS / 1000}s`
    );

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
  },
};

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, statSync } from "fs";
import { SYSTEM_PROMPT } from "../prompts/system";
import { CLASSIFY_PROMPT } from "../prompts/classify";
import { INSURANCE_CERT_PROMPT } from "../prompts/insurance-cert";
import { TRANSPORT_LICENSE_PROMPT } from "../prompts/transport-license";
import { LETTERHEAD_PROMPT } from "../prompts/letterhead";
import { FREIGHT_PROFILE_PROMPT } from "../prompts/freight-profile";
import { COMMUNICATION_PROMPT } from "../prompts/communication";
import { DRIVER_VEHICLE_PROMPT } from "../prompts/driver-vehicle";
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

const client = new Anthropic();

/** Max time for classification (usually fast, single-purpose) */
export const CLASSIFY_TIMEOUT_MS = 90000;

/** Max time for extraction (can be slow for large multi-page PDFs) */
export const ANALYSIS_TIMEOUT_MS = 180000;

/** Wrap a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: Zeitüberschreitung nach ${ms / 1000}s`)), ms)
    ),
  ]);
}

function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.endsWith(".pdf");
}

function getImageMediaType(
  mimeType: string
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const mapping: Record<
    string,
    "image/jpeg" | "image/png" | "image/gif" | "image/webp"
  > = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/gif": "image/gif",
    "image/webp": "image/webp",
  };
  return mapping[mimeType] || "image/jpeg";
}

function buildDocumentContent(
  base64Data: string,
  mimeType: string
): Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam {
  if (isPdf(mimeType)) {
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64Data,
      },
    };
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: getImageMediaType(mimeType),
      data: base64Data,
    },
  };
}

/** Threshold: PDFs larger than this get text-extracted instead of sent as binary */
const PDF_SIZE_THRESHOLD_KB = 100;

/**
 * For large PDFs, extract text from the first N pages using pypdf (Python).
 * This reduces token count from ~60K to ~4K for a typical 11-page document.
 * Falls back to binary PDF if text extraction fails.
 */
async function extractPdfText(filePath: string, maxPages: number = 5): Promise<string | null> {
  try {
    const { execSync } = await import("child_process");
    const script = `
from pypdf import PdfReader
reader = PdfReader("${filePath.replace(/"/g, '\\"')}")
pages = min(${maxPages}, len(reader.pages))
for i in range(pages):
    text = reader.pages[i].extract_text()
    if text:
        print(f"--- SEITE {i+1} von {len(reader.pages)} ---")
        print(text)
`;
    const result = execSync(`python3 -c '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 10000,
      encoding: "utf-8",
    });

    if (result && result.trim().length > 100) {
      console.log(`[pdf-text] Extracted ${result.length} chars (first ${maxPages} pages)`);
      return result;
    }
    return null;
  } catch (err) {
    console.log(`[pdf-text] Text extraction failed, falling back to binary: ${err}`);
    return null;
  }
}

/**
 * Build the content blocks for a Claude message.
 * For large PDFs: extract text and send as text (fast, low tokens).
 * For small PDFs/images: send as binary document/image (preserves layout).
 */
async function buildSmartContent(
  filePath: string,
  mimeType: string,
): Promise<Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam>> {
  const fileSizeKB = statSync(filePath).size / 1024;

  if (isPdf(mimeType) && fileSizeKB > PDF_SIZE_THRESHOLD_KB) {
    // Large PDF → extract text from first 5 pages
    const text = await extractPdfText(filePath, 5);
    if (text) {
      console.log(`[smart-content] Using text extraction for ${Math.round(fileSizeKB)}KB PDF (${text.length} chars, ~${Math.round(text.length/4)} tokens vs ~${Math.round(fileSizeKB * 1.37)} tokens for binary)`);
      return [{ type: "text", text: `[Dokumentinhalt - Erste Seiten]\n\n${text}` }];
    }
  }

  // Small PDF or image → send as binary
  const base64Data = readFileSync(filePath).toString("base64");
  return [buildDocumentContent(base64Data, mimeType)];
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
): Promise<{ documentType: string; confidence: number; reasoning: string; timing: { fileReadMs: number; fileSizeKB: number; apiCallMs: number; totalMs: number } }> {
  const totalStart = Date.now();

  const readStart = Date.now();
  const fileSizeKB = Math.round(statSync(documentPath).size / 1024);
  const contentBlocks = await buildSmartContent(documentPath, mimeType);
  const fileReadMs = Date.now() - readStart;

  console.log(`[classify] File: ${documentPath}, Size: ${fileSizeKB}KB, Read+Extract: ${fileReadMs}ms`);

  const apiStart = Date.now();
  const response = await withTimeout(
    client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...contentBlocks,
            {
              type: "text",
              text: CLASSIFY_PROMPT,
            },
          ],
        },
      ],
    }),
    CLASSIFY_TIMEOUT_MS,
    `Dokumentklassifizierung (${fileSizeKB}KB)`
  );
  const apiCallMs = Date.now() - apiStart;

  console.log(`[classify] API call: ${apiCallMs}ms, Input tokens: ${response.usage?.input_tokens}, Output tokens: ${response.usage?.output_tokens}`);

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from classification");
  }

  const parsed = parseJsonResponse(textBlock.text);
  const totalMs = Date.now() - totalStart;
  console.log(`[classify] Total: ${totalMs}ms, Result: ${parsed.documentType}`);

  return {
    documentType: (parsed.documentType as string) || "unknown",
    confidence: (parsed.confidence as number) || 0,
    reasoning: (parsed.reasoning as string) || "",
    timing: { fileReadMs, fileSizeKB, apiCallMs, totalMs },
  };
}

export const claudeDocumentProvider: AnalysisProvider = {
  id: "claude-document",
  name: "Claude Document Analysis",

  async analyze(
    documentPath: string,
    documentType: string,
    mimeType: string,
    carrierInfo: { name: string; country?: string; vatId?: string }
  ): Promise<ProviderResult> {
    const totalStart = Date.now();

    const fileSizeKB = Math.round(statSync(documentPath).size / 1024);
    const contentBlocks = await buildSmartContent(documentPath, mimeType);
    const prompt = getAnalysisPrompt(documentType);

    const carrierContext = `\n\nKONTEXT zum Frachtführer:\n- Name: ${carrierInfo.name}${carrierInfo.country ? `\n- Land: ${carrierInfo.country}` : ""}${carrierInfo.vatId ? `\n- USt-IdNr: ${carrierInfo.vatId}` : ""}`;

    console.log(`[analyze] File: ${documentPath}, Size: ${fileSizeKB}KB, Type: ${documentType}, Timeout: ${ANALYSIS_TIMEOUT_MS / 1000}s`);

    const apiStart = Date.now();
    const response = await withTimeout(
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...contentBlocks,
              {
                type: "text",
                text: prompt + carrierContext,
              },
            ],
          },
        ],
      }),
      ANALYSIS_TIMEOUT_MS,
      `Dokumentanalyse (${fileSizeKB}KB, ${documentType})`
    );
    const apiCallMs = Date.now() - apiStart;

    console.log(`[analyze] API call: ${apiCallMs}ms, Input tokens: ${response.usage?.input_tokens}, Output tokens: ${response.usage?.output_tokens}`);

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from analysis");
    }

    const totalMs = Date.now() - totalStart;
    console.log(`[analyze] Total: ${totalMs}ms`);

    const rawResponse = textBlock.text;
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
      providerId: "claude-document",
      documentType,
      extraction,
      rawResponse,
    };
  },
};

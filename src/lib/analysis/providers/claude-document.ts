import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
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
export const CLASSIFY_TIMEOUT_MS = 60000;

/** Max time for extraction (can be slow for large multi-page PDFs) */
export const ANALYSIS_TIMEOUT_MS = 120000;

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
): Promise<{ documentType: string; confidence: number; reasoning: string }> {
  const fileBuffer = readFileSync(documentPath);
  const base64Data = fileBuffer.toString("base64");

  const response = await withTimeout(
    client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            buildDocumentContent(base64Data, mimeType),
            {
              type: "text",
              text: CLASSIFY_PROMPT,
            },
          ],
        },
      ],
    }),
    CLASSIFY_TIMEOUT_MS,
    "Dokumentklassifizierung"
  );

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from classification");
  }

  const parsed = parseJsonResponse(textBlock.text);
  return {
    documentType: (parsed.documentType as string) || "unknown",
    confidence: (parsed.confidence as number) || 0,
    reasoning: (parsed.reasoning as string) || "",
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
    const fileBuffer = readFileSync(documentPath);
    const base64Data = fileBuffer.toString("base64");
    const prompt = getAnalysisPrompt(documentType);

    const carrierContext = `\n\nKONTEXT zum Frachtführer:\n- Name: ${carrierInfo.name}${carrierInfo.country ? `\n- Land: ${carrierInfo.country}` : ""}${carrierInfo.vatId ? `\n- USt-IdNr: ${carrierInfo.vatId}` : ""}`;

    const response = await withTimeout(
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              buildDocumentContent(base64Data, mimeType),
              {
                type: "text",
                text: prompt + carrierContext,
              },
            ],
          },
        ],
      }),
      ANALYSIS_TIMEOUT_MS,
      "Dokumentanalyse"
    );

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from analysis");
    }

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

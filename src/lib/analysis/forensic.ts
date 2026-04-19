import type { ProviderResult, RiskSignal } from "./providers/types";
import { analyzeImage, type ImageMetadata } from "./providers/forensic-image";
import { analyzePdf, type PdfInfo } from "./providers/forensic-pdf";

export interface ForensicResult {
  kind: "image" | "pdf";
  metadata: ImageMetadata | PdfInfo;
  riskSignals: RiskSignal[];
}

export async function runForensicAnalysis(
  buffer: Buffer,
  mimeType: string
): Promise<ForensicResult | null> {
  if (mimeType.startsWith("image/")) {
    const { metadata, riskSignals } = await analyzeImage(buffer);
    return { kind: "image", metadata, riskSignals };
  }
  if (mimeType === "application/pdf" || mimeType.endsWith(".pdf")) {
    const { metadata, riskSignals } = await analyzePdf(buffer);
    return { kind: "pdf", metadata, riskSignals };
  }
  return null;
}

export async function applyForensicAnalysis(
  result: ProviderResult,
  buffer: Buffer,
  mimeType: string
): Promise<ProviderResult> {
  let forensic: ForensicResult | null = null;
  try {
    forensic = await runForensicAnalysis(buffer, mimeType);
  } catch {
    forensic = null;
  }
  if (!forensic) return result;
  return {
    ...result,
    extraction: {
      ...result.extraction,
      fields: {
        ...result.extraction.fields,
        forensicMetadata: forensic.metadata,
      },
      riskSignals: [...result.extraction.riskSignals, ...forensic.riskSignals],
    },
  };
}

import { PDFParse } from "pdf-parse";
import type { RiskSignal } from "./types";
import { FORENSIC_WEIGHTS } from "../forensic-weights";
import { logForensicError } from "../log-forensic-error";

export interface PdfInfo {
  Producer?: string;
  Creator?: string;
  Author?: string;
  Title?: string;
  CreationDate?: string;
  ModDate?: string;
}

const ONLINE_EDITOR_PATTERNS = [
  /ilovepdf/i,
  /smallpdf/i,
  /sejda/i,
  /pdfescape/i,
  /soda\s*pdf/i,
  /online2pdf/i,
  /pdf24/i,
];

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;

function parsePdfDate(v: string | undefined): Date | null {
  if (!v) return null;
  const m = v.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/);
  if (!m) return null;
  const d = new Date(
    `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}Z`
  );
  return isNaN(d.getTime()) ? null : d;
}

export function evaluatePdfMetadata(
  info: PdfInfo,
  prevCount: number,
  hasJS: boolean
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  const producerCreator = `${info.Producer ?? ""} ${info.Creator ?? ""}`;
  if (
    producerCreator.trim() &&
    ONLINE_EDITOR_PATTERNS.some((p) => p.test(producerCreator))
  ) {
    const w = FORENSIC_WEIGHTS.pdf.onlineEditorFingerprint;
    signals.push({
      severity: w.severity,
      rule: "pdf-online-editor",
      description: `PDF wurde mit einem Online-Editor erstellt/bearbeitet (${info.Producer ?? info.Creator})`,
      points: w.points,
    });
  }

  if (prevCount > 0) {
    const w = FORENSIC_WEIGHTS.pdf.incrementalUpdates;
    signals.push({
      severity: w.severity,
      rule: "pdf-incremental-updates",
      description: `PDF wurde nach Erstellung geändert (${prevCount} inkrementelle Updates)`,
      points: w.points,
    });
  }

  if (hasJS) {
    const w = FORENSIC_WEIGHTS.pdf.embeddedJavascript;
    signals.push({
      severity: w.severity,
      rule: "pdf-embedded-javascript",
      description: "PDF enthält eingebetteten JavaScript-Code",
      points: w.points,
    });
  }

  const hasMetadata = !!(
    info.Producer || info.Creator || info.Author || info.Title
  );
  if (!hasMetadata) {
    const w = FORENSIC_WEIGHTS.pdf.noMetadata;
    signals.push({
      severity: w.severity,
      rule: "pdf-no-metadata",
      description: "PDF enthält keine Metadaten (möglicherweise entfernt)",
      points: w.points,
    });
  }

  const created = parsePdfDate(info.CreationDate);
  const modified = parsePdfDate(info.ModDate);
  if (created && modified) {
    const delta = modified.getTime() - created.getTime();
    if (delta < 0 || delta > FIVE_YEARS_MS) {
      const w = FORENSIC_WEIGHTS.pdf.dateInconsistency;
      signals.push({
        severity: w.severity,
        rule: "pdf-date-inconsistency",
        description: "Erstellungs- und Änderungsdatum sind inkonsistent",
        points: w.points,
      });
    }
  }

  return signals;
}

export interface PdfAnalysisResult {
  metadata: PdfInfo;
  riskSignals: RiskSignal[];
}

export async function analyzePdf(buffer: Buffer): Promise<PdfAnalysisResult> {
  let info: PdfInfo = {};
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getInfo();
    info = (result.info ?? {}) as PdfInfo;
  } catch (err) {
    logForensicError("analyzePdf", err);
    info = {};
  } finally {
    await parser.destroy().catch(() => {});
  }

  const text = buffer.toString("latin1");
  const prevCount = (text.match(/\/Prev\s+\d+/g) || []).length;
  const hasJS = /\/JS\b|\/JavaScript\b|\/OpenAction\b/.test(text);

  return {
    metadata: info,
    riskSignals: evaluatePdfMetadata(info, prevCount, hasJS),
  };
}

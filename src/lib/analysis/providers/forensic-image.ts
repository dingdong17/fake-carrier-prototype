import exifr from "exifr";
import type { RiskSignal } from "./types";
import { FORENSIC_WEIGHTS } from "../forensic-weights";
import { logForensicError } from "../log-forensic-error";

export interface ImageMetadata {
  Software?: string;
  Make?: string;
  Model?: string;
  DateTimeOriginal?: string | Date;
  ModifyDate?: string | Date;
  GPSLatitude?: number;
  GPSLongitude?: number;
}

const EDITING_SOFTWARE_PATTERNS = [
  /photoshop/i,
  /lightroom/i,
  /gimp/i,
  /pixelmator/i,
  /affinity\s*photo/i,
  /paint\.net/i,
];

const DAY_MS = 24 * 60 * 60 * 1000;

function parseExifDate(v: string | Date | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const iso = v.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

const EXIF_IDENTIFYING_FIELDS: (keyof ImageMetadata)[] = [
  "Make",
  "Model",
  "Software",
  "DateTimeOriginal",
  "ModifyDate",
  "GPSLatitude",
];

function hasExifMetadata(meta: ImageMetadata): boolean {
  return EXIF_IDENTIFYING_FIELDS.some((k) => {
    const v = meta[k];
    return v !== undefined && v !== null && v !== "";
  });
}

export function evaluateImageMetadata(meta: ImageMetadata): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (!hasExifMetadata(meta)) {
    const w = FORENSIC_WEIGHTS.image.noMetadata;
    signals.push({
      severity: w.severity,
      rule: "image-no-metadata",
      description: "Bild enthält keine EXIF-Metadaten (möglicherweise entfernt)",
      points: w.points,
    });
    return signals;
  }

  if (meta.Software && EDITING_SOFTWARE_PATTERNS.some((p) => p.test(meta.Software!))) {
    const w = FORENSIC_WEIGHTS.image.editingSoftwareFingerprint;
    signals.push({
      severity: w.severity,
      rule: "image-editing-software",
      description: `Bild wurde mit ${meta.Software} bearbeitet`,
      points: w.points,
    });
  }

  const original = parseExifDate(meta.DateTimeOriginal);
  const modified = parseExifDate(meta.ModifyDate);
  if (original && modified && Math.abs(modified.getTime() - original.getTime()) > DAY_MS) {
    const w = FORENSIC_WEIGHTS.image.dateInconsistency;
    signals.push({
      severity: w.severity,
      rule: "image-date-inconsistency",
      description: "Aufnahme- und Änderungsdatum weichen um mehr als 24 Stunden ab",
      points: w.points,
    });
  }

  return signals;
}

export interface ImageAnalysisResult {
  metadata: ImageMetadata;
  riskSignals: RiskSignal[];
}

export async function analyzeImage(buffer: Buffer): Promise<ImageAnalysisResult> {
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = await exifr.parse(buffer);
  } catch (err) {
    logForensicError("analyzeImage", err);
    parsed = undefined;
  }
  const metadata: ImageMetadata = (parsed ?? {}) as ImageMetadata;
  return { metadata, riskSignals: evaluateImageMetadata(metadata) };
}

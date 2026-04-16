import { DOCUMENT_TYPES, getTotalConfidenceWeight } from "@/lib/config/document-types";
import type { ProviderResult, CrossCheckResult, RiskSignal, GuidanceItem } from "./providers/types";

const SEVERITY_POINTS: Record<string, { min: number; max: number }> = {
  critical: { min: 30, max: 50 },
  major: { min: 15, max: 25 },
  minor: { min: 5, max: 10 },
};

export function calculateRiskScore(documentResults: ProviderResult[], crossCheck: CrossCheckResult): number {
  let totalPoints = 0;
  for (const result of documentResults) {
    for (const signal of result.extraction.riskSignals) {
      totalPoints += signal.points;
    }
  }
  for (const mismatch of crossCheck.mismatches) {
    const range = SEVERITY_POINTS[mismatch.severity];
    if (range) {
      totalPoints += Math.round((range.min + range.max) / 2);
    }
  }
  return Math.min(100, totalPoints);
}

export function calculateConfidenceLevel(documentResults: ProviderResult[]): number {
  const totalWeight = getTotalConfidenceWeight();
  let weightedConfidence = 0;
  for (const result of documentResults) {
    const docType = DOCUMENT_TYPES[result.documentType];
    if (!docType) continue;
    const docConfidence = result.extraction.confidence;
    weightedConfidence += (docType.confidenceWeight / totalWeight) * docConfidence;
  }
  return Math.round(weightedConfidence * 100);
}

export function determineRecommendation(riskScore: number, confidenceLevel: number): "approve" | "review" | "warning" | "reject" {
  if (riskScore <= 25 && confidenceLevel >= 60) return "approve";
  if (riskScore >= 56 && confidenceLevel >= 40) return "reject";
  if (riskScore >= 56 && confidenceLevel < 40) return "warning";
  return "review";
}

export function getRiskLevel(score: number): "low" | "medium" | "high" {
  if (score <= 25) return "low";
  if (score <= 55) return "medium";
  return "high";
}

export function generateGuidance(documentResults: ProviderResult[], crossCheck: CrossCheckResult): GuidanceItem[] {
  const guidance: GuidanceItem[] = [];

  for (const result of documentResults) {
    const docType = DOCUMENT_TYPES[result.documentType];
    if (!docType) continue;
    const extractedCount = Object.keys(result.extraction.fields).length;
    if (extractedCount > 0) {
      guidance.push({
        tier: "ai_verified",
        labelDe: "Automatisch geprüft",
        description: `${docType.labelDe}: ${extractedCount} Felder extrahiert und geprüft`,
      });
    }
  }

  if (crossCheck.mismatches.length === 0 && documentResults.length > 1) {
    guidance.push({
      tier: "ai_verified",
      labelDe: "Automatisch geprüft",
      description: "Dokumentübergreifende Konsistenzprüfung bestanden",
    });
  }

  guidance.push({
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Versicherungsschutz telefonisch beim Versicherer bestätigen lassen",
    action: "Rufen Sie den Versicherer unter der angegebenen Nummer an",
  });
  guidance.push({
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Festnetznummer des Unternehmens durch Rückruf prüfen",
    action: "Rufen Sie die Festnetznummer am Firmensitz an",
  });
  guidance.push({
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Personen- und Lieferdokumente bei Übergabe der Ware prüfen",
    action: "Personalausweis, Frachtbrief und Kennzeichen bei Übergabe kontrollieren",
  });

  guidance.push({
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Aktuelle Solvenz und Zahlungsfähigkeit des Unternehmens",
  });
  guidance.push({
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Echtzeit-Fahrzeugortung und Sendungsverfolgung",
  });
  guidance.push({
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Strafrechtliche Vorgeschichte der beteiligten Personen",
  });

  return guidance;
}

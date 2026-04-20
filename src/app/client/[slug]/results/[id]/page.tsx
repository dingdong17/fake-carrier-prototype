"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProgressBar } from "@/components/check/progress-bar";
import { RecommendationBanner } from "@/components/results/recommendation-banner";
import { RiskConfidenceChart } from "@/components/results/risk-confidence-chart";
import { NextSteps } from "@/components/results/next-steps";
import { MissingDocs } from "@/components/results/missing-docs";
import { ProvidedDocs } from "@/components/results/provided-docs";
import { GuidanceTier } from "@/components/results/guidance-tier";
import { DocumentCard } from "@/components/results/document-card";
import { ChatPanel } from "@/components/results/chat-panel";
import { FeedbackPrompt } from "@/components/feedback/feedback-prompt";
import { extractCarrierPrefill } from "@/lib/extraction-prefill";
import type { CarrierFormData } from "@/components/check/carrier-form";

function CoInsuredList({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const items = value
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const threshold = 3;

  if (items.length <= threshold) {
    return (
      <>
        {items.map((item, i) => (
          <div key={i}>{item}</div>
        ))}
      </>
    );
  }

  const visible = expanded ? items : items.slice(0, threshold);
  const hiddenCount = items.length - threshold;

  return (
    <>
      {visible.map((item, i) => (
        <div key={i}>{item}</div>
      ))}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-xs font-medium text-ec-info hover:underline"
      >
        {expanded ? "Weniger anzeigen" : `… +${hiddenCount} weitere anzeigen`}
      </button>
    </>
  );
}

const SUMMARY_FIELDS: Array<{ key: keyof CarrierFormData; label: string; suffix?: string }> = [
  { key: "carrierName", label: "Firmenname" },
  { key: "carrierCountry", label: "Land" },
  { key: "carrierVatId", label: "USt-IdNr." },
  { key: "carrierWebsite", label: "Webseite" },
  { key: "carrierEmail", label: "E-Mail" },
  { key: "insurer", label: "Versicherer" },
  { key: "policyNumber", label: "Policennummer" },
  { key: "sumInsured", label: "Versicherungssumme", suffix: " EUR" },
  { key: "coverageStart", label: "Deckung von" },
  { key: "coverageEnd", label: "Deckung bis" },
  { key: "coInsured", label: "Mitversichert" },
];

interface CheckData {
  id: string;
  checkNumber: string;
  carrierName: string;
  carrierCountry: string | null;
  carrierVatId: string | null;
  riskScore: number | null;
  confidenceLevel: number | null;
  recommendation: "approve" | "review" | "warning" | "reject" | null;
  status: string;
  createdAt: string;
}

interface DocumentData {
  id: string;
  documentType: string;
  fileName: string;
  extractedFields: Record<string, unknown> | null;
  riskSignals: Array<{
    rule?: string;
    ruleId?: string;
    severity: string;
    description?: string;
    message?: string;
    points?: number;
  }> | null;
  documentScore: number | null;
  confidence: number | null;
}

interface GuidanceItem {
  tier: "ai_verified" | "human_required" | "outside_scope";
  labelDe: string;
  description: string;
  action?: string;
}

const DEFAULT_GUIDANCE: GuidanceItem[] = [
  {
    tier: "ai_verified",
    labelDe: "Automatisch geprüft",
    description: "Dokumentenfelder extrahiert und auf Konsistenz geprüft",
  },
  {
    tier: "ai_verified",
    labelDe: "Automatisch geprüft",
    description: "Dokumentenübergreifende Konsistenzprüfung durchgeführt",
  },
  {
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Versicherungsschutz telefonisch beim Versicherer bestätigen lassen",
    action: "Rufen Sie den Versicherer unter der angegebenen Nummer an",
  },
  {
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Festnetznummer des Unternehmens durch Rückruf prüfen",
    action: "Rufen Sie die Festnetznummer am Firmensitz an",
  },
  {
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Personen- und Lieferdokumente bei Übergabe der Ware prüfen",
    action: "Personalausweis, Frachtbrief und Kennzeichen bei Übergabe kontrollieren",
  },
  {
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Aktuelle Solvenz und Zahlungsfähigkeit des Unternehmens",
  },
  {
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Echtzeit-Fahrzeugortung und Sendungsverfolgung",
  },
  {
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Strafrechtliche Vorgeschichte der beteiligten Personen",
  },
];

const DEFAULT_NEXT_STEPS = [
  "Versicherungsschutz telefonisch beim Versicherer bestätigen",
  "Festnetznummer des Unternehmens durch Rückruf verifizieren",
  "Fehlende Dokumentfelder nachfordern",
];

function getExplanation(recommendation: string | null, riskScore: number, confidenceLevel: number): string {
  switch (recommendation) {
    case "approve":
      return `Der Frachtführer zeigt ein niedriges Risikoprofil (Score: ${riskScore.toFixed(0)}) bei hohem Vertrauensniveau (${confidenceLevel.toFixed(0)}%). Die eingereichten Dokumente sind konsistent und vollständig.`;
    case "review":
      return `Einige Aspekte erfordern eine manuelle Prüfung. Risikoscore: ${riskScore.toFixed(0)}, Vertrauensniveau: ${confidenceLevel.toFixed(0)}%. Bitte prüfen Sie die markierten Punkte.`;
    case "warning":
      return `Mehrere Risikoindikatoren wurden identifiziert (Score: ${riskScore.toFixed(0)}). Das Vertrauensniveau liegt bei ${confidenceLevel.toFixed(0)}%. Eine gründliche manuelle Prüfung wird empfohlen.`;
    case "reject":
      return `Hohe Risikoindikatoren erkannt (Score: ${riskScore.toFixed(0)}). Vertrauensniveau: ${confidenceLevel.toFixed(0)}%. Eine Zusammenarbeit wird nicht empfohlen.`;
    default:
      return "Analyse noch nicht abgeschlossen.";
  }
}

export default function ResultsPage() {
  const params = useParams<{ slug: string; id: string }>();
  const [check, setCheck] = useState<CheckData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/checks?id=${params.id}`);
        if (!res.ok) {
          throw new Error("Prüfung nicht gefunden");
        }
        const data = await res.json();
        setCheck(data.check);
        setDocuments(data.documents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ec-light-grey flex items-center justify-center">
        <div className="text-ec-grey-70">Ergebnisse werden geladen...</div>
      </div>
    );
  }

  if (error || !check) {
    return (
      <div className="min-h-screen bg-ec-light-grey flex items-center justify-center">
        <div className="text-ec-error">{error ?? "Prüfung nicht gefunden"}</div>
      </div>
    );
  }

  // Load risk answers from localStorage
  const storedAnswers = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem(`risk-answers-${params.id}`) || "[]")
    : [];
  const riskQuestionPoints = storedAnswers.reduce((sum: number, a: { questionId: string; answer: string }) => {
    if (a.answer !== "yes") return sum;
    const POINTS: Record<string, number> = {
      "email-only": 20, "time-pressure": 30, "unusually-low-price": 20,
      "freemail-address": 15, "mobile-only": 15, "subcontracting": 25,
      "platform-rating": -20, "live-tracking": -30,
    };
    return sum + (POINTS[a.questionId] || 0);
  }, 0);

  const baseRiskScore = check.riskScore ?? 0;
  const riskScore = Math.max(0, Math.min(100, baseRiskScore + riskQuestionPoints));
  const confidenceLevel = check.confidenceLevel ?? 0;

  // Recalculate recommendation with adjusted score
  let recommendation: "approve" | "review" | "warning" | "reject";
  if (riskScore <= 25 && confidenceLevel >= 60) recommendation = "approve";
  else if (riskScore >= 56 && confidenceLevel >= 40) recommendation = "reject";
  else if (riskScore >= 56 && confidenceLevel < 40) recommendation = "warning";
  else recommendation = "review";

  const providedTypes = [...new Set(documents.map((d) => d.documentType).filter((t) => t !== "unknown"))];
  const explanation = getExplanation(recommendation, riskScore, confidenceLevel);

  const mergedPrefill: Partial<CarrierFormData> = {};
  for (const doc of documents) {
    const fields = (doc.extractedFields ?? {}) as Record<string, unknown>;
    const p = extractCarrierPrefill(doc.documentType, fields);
    for (const [k, v] of Object.entries(p)) {
      const key = k as keyof CarrierFormData;
      if (!mergedPrefill[key] && v) mergedPrefill[key] = v as string;
    }
  }
  const summary: Record<keyof CarrierFormData, string> = {
    carrierName: check.carrierName,
    carrierCountry: check.carrierCountry ?? mergedPrefill.carrierCountry ?? "",
    carrierVatId: check.carrierVatId ?? mergedPrefill.carrierVatId ?? "",
    carrierEmail: mergedPrefill.carrierEmail ?? "",
    carrierWebsite: mergedPrefill.carrierWebsite ?? "",
    insurer: mergedPrefill.insurer ?? "",
    policyNumber: mergedPrefill.policyNumber ?? "",
    sumInsured: mergedPrefill.sumInsured ?? "",
    coverageStart: mergedPrefill.coverageStart ?? "",
    coverageEnd: mergedPrefill.coverageEnd ?? "",
    coInsured: mergedPrefill.coInsured ?? "",
  };
  const createdDate = new Date(check.createdAt).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="min-h-screen bg-ec-light-grey">
      <div className="px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <ProgressBar currentStep={3} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-barlow text-ec-grey-80">
              {check.carrierName}
            </h1>
            <p className="text-sm text-ec-grey-70 mt-1">
              Prüfung {check.checkNumber} &middot; {createdDate}
              {check.carrierCountry && <span> &middot; {check.carrierCountry}</span>}
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-ec-dark-blue bg-white px-4 py-2 text-sm font-medium text-ec-dark-blue hover:bg-ec-dark-blue/5 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF Report herunterladen
          </button>
        </div>

        {/* Geprüfte Daten — what the score is based on */}
        <div className="mb-6 rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-ec-grey-80 mb-4 font-barlow">
            Geprüfte Daten
          </h3>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {SUMMARY_FIELDS.map(({ key, label, suffix }) => {
              const val = summary[key];
              if (!val) return null;
              return (
                <div
                  key={key}
                  className="flex justify-between gap-4 border-b border-ec-light-grey py-1.5"
                >
                  <dt className="text-sm text-ec-grey-70">{label}</dt>
                  <dd className="text-sm font-medium text-ec-grey-80 text-right whitespace-pre-line">
                    {key === "coInsured" ? (
                      <CoInsuredList value={val} />
                    ) : (
                      <>
                        {val}
                        {suffix ?? ""}
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* Recommendation */}
        <div className="mb-6">
          <RecommendationBanner
            recommendation={recommendation}
            explanation={explanation}
            riskScore={riskScore}
            confidenceLevel={confidenceLevel}
          />
        </div>

        {/* Risk question impact */}
        {storedAnswers.length > 0 && riskQuestionPoints !== 0 && (
          <div className="mb-6 rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-ec-grey-80 mb-3 font-barlow">
              Verhaltens- & Kontextbewertung
            </h3>
            <div className="space-y-2">
              {storedAnswers
                .filter((a: { answer: string }) => a.answer === "yes")
                .map((a: { questionId: string; answer: string; autoDetected?: boolean; detail?: string }) => {
                  const LABELS: Record<string, string> = {
                    "email-only": "Nur E-Mail-Kommunikation",
                    "time-pressure": "Zeitdruck bei Auftragsvergabe",
                    "unusually-low-price": "Ungewöhnlich niedriger Preis",
                    "freemail-address": "Freemail-Adresse verwendet",
                    "mobile-only": "Nur Mobilnummer",
                    "subcontracting": "Weitergabe an Unterfrachtführer",
                    "platform-rating": "Positive Plattform-Bewertungen",
                    "live-tracking": "Live-Tracking angeboten",
                  };
                  const POINTS: Record<string, number> = {
                    "email-only": 20, "time-pressure": 30, "unusually-low-price": 20,
                    "freemail-address": 15, "mobile-only": 15, "subcontracting": 25,
                    "platform-rating": -20, "live-tracking": -30,
                  };
                  const pts = POINTS[a.questionId] || 0;
                  return (
                    <div key={a.questionId} className="flex items-center justify-between rounded-lg bg-ec-light-grey px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${pts > 0 ? "text-ec-error" : "text-ec-success"}`}>
                          {pts > 0 ? "⚠" : "✓"}
                        </span>
                        <span className="text-sm text-ec-grey-80">
                          {LABELS[a.questionId] || a.questionId}
                        </span>
                        {a.autoDetected && (
                          <span className="text-[10px] font-medium text-ec-info">KI</span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${pts > 0 ? "text-ec-error" : "text-ec-success"}`}>
                        {pts > 0 ? `+${pts}` : pts} Punkte
                      </span>
                    </div>
                  );
                })}
              <div className="flex items-center justify-between border-t border-ec-medium-grey pt-2 mt-2">
                <span className="text-sm font-medium text-ec-grey-80">Gesamteffekt Verhaltensanalyse</span>
                <span className={`text-sm font-bold ${riskQuestionPoints > 0 ? "text-ec-error" : riskQuestionPoints < 0 ? "text-ec-success" : "text-ec-grey-70"}`}>
                  {riskQuestionPoints > 0 ? `+${riskQuestionPoints}` : riskQuestionPoints} Punkte
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Grid: Chart + NextSteps + MissingDocs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-ec-grey-80 mb-4 font-barlow">Risiko-Vertrauens-Matrix</h3>
            <RiskConfidenceChart riskScore={riskScore} confidenceLevel={confidenceLevel} />
          </div>
          <div className="space-y-4">
            <NextSteps steps={DEFAULT_NEXT_STEPS} />
            <ProvidedDocs
              documents={documents.map((d) => ({
                documentType: d.documentType,
                fileName: d.fileName,
              }))}
            />
            <MissingDocs providedTypes={providedTypes} />
          </div>
        </div>

        {/* Guidance */}
        <div className="mb-6">
          <GuidanceTier guidance={DEFAULT_GUIDANCE} />
        </div>

        {/* Document cards */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-ec-grey-80 font-barlow mb-4">Analysierte Dokumente</h3>
          <div className="space-y-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="mb-6">
          <FeedbackPrompt checkId={params.id} />
        </div>

        {/* Chat button */}
        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-ec-dark-blue px-6 py-3 text-sm font-medium text-white hover:bg-ec-dark-blue/90 transition-colors shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat mit Agent
          </button>
        </div>
      </div>

      <ChatPanel
        checkId={params.id}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}

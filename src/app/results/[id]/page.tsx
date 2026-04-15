"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProgressBar } from "@/components/check/progress-bar";
import { RecommendationBanner } from "@/components/results/recommendation-banner";
import { RiskConfidenceChart } from "@/components/results/risk-confidence-chart";
import { NextSteps } from "@/components/results/next-steps";
import { MissingDocs } from "@/components/results/missing-docs";
import { GuidanceTier } from "@/components/results/guidance-tier";
import { DocumentCard } from "@/components/results/document-card";
import { ChatPanel } from "@/components/results/chat-panel";

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
  riskSignals: Array<{ ruleId: string; severity: "critical" | "high" | "medium" | "low"; message: string }> | null;
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
    labelDe: "Automatisch gepr\u00FCft",
    description: "Dokumentenfelder extrahiert und auf Konsistenz gepr\u00FCft",
  },
  {
    tier: "ai_verified",
    labelDe: "Automatisch gepr\u00FCft",
    description: "Dokumenten\u00FCbergreifende Konsistenzpr\u00FCfung durchgef\u00FChrt",
  },
  {
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Versicherungsschutz telefonisch beim Versicherer best\u00E4tigen lassen",
    action: "Rufen Sie den Versicherer unter der angegebenen Nummer an",
  },
  {
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Festnetznummer des Unternehmens durch R\u00FCckruf pr\u00FCfen",
    action: "Rufen Sie die Festnetznummer am Firmensitz an",
  },
  {
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Personen- und Lieferdokumente bei \u00DCbergabe der Ware pr\u00FCfen",
    action: "Personalausweis, Frachtbrief und Kennzeichen bei \u00DCbergabe kontrollieren",
  },
  {
    tier: "outside_scope",
    labelDe: "Au\u00DFerhalb der Pr\u00FCfm\u00F6glichkeit",
    description: "Aktuelle Solvenz und Zahlungsf\u00E4higkeit des Unternehmens",
  },
  {
    tier: "outside_scope",
    labelDe: "Au\u00DFerhalb der Pr\u00FCfm\u00F6glichkeit",
    description: "Echtzeit-Fahrzeugortung und Sendungsverfolgung",
  },
  {
    tier: "outside_scope",
    labelDe: "Au\u00DFerhalb der Pr\u00FCfm\u00F6glichkeit",
    description: "Strafrechtliche Vorgeschichte der beteiligten Personen",
  },
];

const DEFAULT_NEXT_STEPS = [
  "Versicherungsschutz telefonisch beim Versicherer best\u00E4tigen",
  "Festnetznummer des Unternehmens durch R\u00FCckruf verifizieren",
  "Fehlende Dokumentfelder nachfordern",
];

function getExplanation(recommendation: string | null, riskScore: number, confidenceLevel: number): string {
  switch (recommendation) {
    case "approve":
      return `Der Frachtf\u00FChrer zeigt ein niedriges Risikoprofil (Score: ${riskScore.toFixed(0)}) bei hohem Vertrauensniveau (${confidenceLevel.toFixed(0)}%). Die eingereichten Dokumente sind konsistent und vollst\u00E4ndig.`;
    case "review":
      return `Einige Aspekte erfordern eine manuelle Pr\u00FCfung. Risikoscore: ${riskScore.toFixed(0)}, Vertrauensniveau: ${confidenceLevel.toFixed(0)}%. Bitte pr\u00FCfen Sie die markierten Punkte.`;
    case "warning":
      return `Mehrere Risikoindikatoren wurden identifiziert (Score: ${riskScore.toFixed(0)}). Das Vertrauensniveau liegt bei ${confidenceLevel.toFixed(0)}%. Eine gr\u00FCndliche manuelle Pr\u00FCfung wird empfohlen.`;
    case "reject":
      return `Hohe Risikoindikatoren erkannt (Score: ${riskScore.toFixed(0)}). Vertrauensniveau: ${confidenceLevel.toFixed(0)}%. Eine Zusammenarbeit wird nicht empfohlen.`;
    default:
      return "Analyse noch nicht abgeschlossen.";
  }
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
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
          throw new Error("Pr\u00FCfung nicht gefunden");
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
        <div className="text-ec-error">{error ?? "Pr\u00FCfung nicht gefunden"}</div>
      </div>
    );
  }

  const riskScore = check.riskScore ?? 0;
  const confidenceLevel = check.confidenceLevel ?? 0;
  const recommendation = check.recommendation ?? "review";
  const providedTypes = [...new Set(documents.map((d) => d.documentType).filter((t) => t !== "unknown"))];
  const explanation = getExplanation(recommendation, riskScore, confidenceLevel);
  const createdDate = new Date(check.createdAt).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="min-h-screen bg-ec-light-grey">
      <div className="mx-auto max-w-content px-6 py-8">
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
              Pr\u00FCfung {check.checkNumber} &middot; {createdDate}
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

        {/* Recommendation */}
        <div className="mb-6">
          <RecommendationBanner
            recommendation={recommendation}
            explanation={explanation}
            riskScore={riskScore}
            confidenceLevel={confidenceLevel}
          />
        </div>

        {/* Grid: Chart + NextSteps + MissingDocs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-ec-grey-80 mb-4 font-barlow">Risiko-Vertrauens-Matrix</h3>
            <RiskConfidenceChart riskScore={riskScore} confidenceLevel={confidenceLevel} />
          </div>
          <div className="space-y-4">
            <NextSteps steps={DEFAULT_NEXT_STEPS} />
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

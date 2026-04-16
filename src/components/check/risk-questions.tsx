"use client";

import { useState, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface RiskAnswer {
  questionId: string;
  answer: "yes" | "no" | "unknown";
  autoDetected: boolean;
  detail?: string;
}

interface RiskQuestion {
  id: string;
  questionDe: string;
  hintDe: string;
  riskIfYes: "critical" | "major" | "minor" | "trust";
  pointsIfYes: number;
}

const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "email-only",
    questionDe: "Hat der Frachtführer ausschließlich per E-Mail kommuniziert?",
    hintDe: "Kein Telefonat, kein Festnetzanruf, keine persönliche Kontaktaufnahme — nur E-Mail oder Messenger.",
    riskIfYes: "major",
    pointsIfYes: 20,
  },
  {
    id: "time-pressure",
    questionDe: "Wurden Sie unter Zeitdruck gesetzt?",
    hintDe: 'Z.B. „Mein LKW ist nur noch 10 Minuten verfügbar", „Sofort zusagen oder Kapazität ist weg" — künstlicher Zeitdruck ist ein typisches Betrugsmuster.',
    riskIfYes: "critical",
    pointsIfYes: 30,
  },
  {
    id: "unusually-low-price",
    questionDe: "Ist der angebotene Preis ungewöhnlich niedrig?",
    hintDe: "Deutlich unter Marktpreis liegende Angebote sind ein Warnsignal — seriöse Frachtführer arbeiten nicht unter Selbstkosten.",
    riskIfYes: "major",
    pointsIfYes: 20,
  },
  {
    id: "freemail-address",
    questionDe: "Verwendet der Frachtführer eine Freemail-Adresse (Gmail, GMX, Hotmail)?",
    hintDe: "Professionelle Unternehmen nutzen in der Regel eigene E-Mail-Domains. Freemail-Adressen sind ein Risikofaktor.",
    riskIfYes: "major",
    pointsIfYes: 15,
  },
  {
    id: "mobile-only",
    questionDe: "Ist der Frachtführer nur über Mobilfunknummer erreichbar?",
    hintDe: "Kein Festnetzanschluss am Firmensitz — ein seriöses Transportunternehmen hat einen Festnetzanschluss.",
    riskIfYes: "major",
    pointsIfYes: 15,
  },
  {
    id: "subcontracting",
    questionDe: "Will der Frachtführer den Auftrag an einen weiteren Unterfrachtführer weitergeben?",
    hintDe: "Weitergabe an unbekannte Dritte erhöht das Risiko erheblich und sollte vertraglich ausgeschlossen werden.",
    riskIfYes: "critical",
    pointsIfYes: 25,
  },
  {
    id: "platform-rating",
    questionDe: "Hat der Frachtführer positive Bewertungen auf Plattformen (z.B. TIMOCOM, Trans.eu)?",
    hintDe: "Hohe Bewertungen und langjährige Mitgliedschaft auf anerkannten Frachtenbörsen sind ein starkes Vertrauenssignal.",
    riskIfYes: "trust" as any,
    pointsIfYes: -20,
  },
  {
    id: "live-tracking",
    questionDe: "Bietet der Frachtführer Live-Tracking der Sendung an?",
    hintDe: "Bereitschaft zur Fahrzeugortung und Sendungsverfolgung ist ein sehr starkes Vertrauenssignal — Betrüger vermeiden Tracking.",
    riskIfYes: "trust" as any,
    pointsIfYes: -30,
  },
];

const ANSWER_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Ja", color: "text-[var(--brand-error)]" },
  no: { label: "Nein", color: "text-[var(--brand-success)]" },
  unknown: { label: "Weiß nicht", color: "text-[var(--brand-text-muted)]" },
};

interface RiskQuestionsProps {
  answers: RiskAnswer[];
  onAnswer: (questionId: string, answer: "yes" | "no" | "unknown") => void;
}

export { RISK_QUESTIONS };

export function RiskQuestions({ answers, onAnswer }: RiskQuestionsProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold" style={{ color: "var(--brand-primary)" }}>
          Verhaltens- und Kontextfragen
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--brand-text-muted)" }}>
          Diese Fragen helfen bei der Risikobewertung. Beantworten Sie diese aus Ihrer Erfahrung mit dem Frachtführer. Falls die KI Hinweise aus den Dokumenten extrahiert hat, sind diese bereits vorausgefüllt.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {RISK_QUESTIONS.map((q) => {
            const existing = answers.find((a) => a.questionId === q.id);
            return (
              <div
                key={q.id}
                className="rounded-lg border p-4"
                style={{ borderColor: existing?.answer === "yes" ? (q.pointsIfYes > 0 ? "var(--brand-error)" : "var(--brand-success)") : "var(--brand-border)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--brand-text)" }}>
                      {q.questionDe}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--brand-text-muted)" }}>
                      {q.hintDe}
                    </p>
                    {existing?.autoDetected && existing.detail && (
                      <p className="mt-1 text-xs font-medium" style={{ color: "var(--brand-info)" }}>
                        KI-Hinweis: {existing.detail}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(["yes", "no", "unknown"] as const).map((ans) => {
                      const isSelected = existing?.answer === ans;
                      const cfg = ANSWER_LABELS[ans];
                      return (
                        <button
                          key={ans}
                          onClick={() => onAnswer(q.id, ans)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isSelected
                              ? ans === "yes"
                                ? "border-[var(--brand-error)] bg-[var(--brand-error)]/10 text-[var(--brand-error)]"
                                : ans === "no"
                                  ? "border-[var(--brand-success)] bg-[var(--brand-success)]/10 text-[var(--brand-success)]"
                                  : "border-[var(--brand-border)] bg-[var(--brand-border-light)] text-[var(--brand-text-muted)]"
                              : "border-[var(--brand-border)] text-[var(--brand-text-muted)] hover:bg-[var(--brand-border-light)]"
                          }`}
                          style={isSelected ? {
                            borderColor: ans === "yes" ? "var(--brand-error)" : ans === "no" ? "var(--brand-success)" : "var(--brand-border)",
                            backgroundColor: ans === "yes" ? "rgba(var(--brand-error), 0.1)" : ans === "no" ? "rgba(var(--brand-success), 0.1)" : undefined,
                            color: ans === "yes" ? "var(--brand-error)" : ans === "no" ? "var(--brand-success)" : "var(--brand-text-muted)",
                          } : undefined}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                    {existing?.autoDetected && (
                      <Badge variant="info">KI</Badge>
                    )}
                  </div>
                </div>
                {existing?.answer === "yes" && q.pointsIfYes > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <Badge variant={q.riskIfYes === "critical" ? "critical" : "high"}>
                      +{q.pointsIfYes} Risikopunkte
                    </Badge>
                  </div>
                )}
                {existing?.answer === "yes" && q.pointsIfYes < 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <Badge variant="success">
                      {q.pointsIfYes} Risikopunkte (Vertrauensbonus)
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

interface RiskSignal {
  ruleId: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
}

interface DocumentCardProps {
  document: {
    id: string;
    documentType: string;
    fileName: string;
    extractedFields: Record<string, unknown> | null;
    riskSignals: RiskSignal[] | null;
    documentScore: number | null;
    confidence: number | null;
  };
}

const severityVariant: Record<string, "critical" | "high" | "medium" | "low"> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

export function DocumentCard({ document: doc }: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const docType = DOCUMENT_TYPES[doc.documentType];
  const typeName = docType?.labelDe ?? doc.documentType;
  const signals = doc.riskSignals ?? [];
  const fields = doc.extractedFields ?? {};
  const fieldEntries = Object.entries(fields);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-ec-light-grey/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ec-dark-blue/10 text-ec-dark-blue">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <span className="font-medium text-ec-grey-80">{typeName}</span>
            <span className="ml-2 text-sm text-ec-grey-70">{doc.fileName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {signals.length > 0 && (
            <Badge variant={signals.some((s) => s.severity === "critical") ? "critical" : signals.some((s) => s.severity === "high") ? "high" : "medium"}>
              {signals.length} Signal{signals.length !== 1 ? "e" : ""}
            </Badge>
          )}
          {doc.confidence !== null && (
            <Badge variant={doc.confidence >= 0.7 ? "success" : doc.confidence >= 0.4 ? "warning" : "critical"}>
              {(doc.confidence * 100).toFixed(0)}% Vertrauen
            </Badge>
          )}
          <svg
            className={`h-4 w-4 text-ec-grey-70 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-ec-medium-grey px-4 pb-4">
          {/* Extracted fields */}
          {fieldEntries.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-ec-grey-80 mb-2">Extrahierte Felder</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ec-grey-40">
                      <th className="text-left py-1.5 pr-4 text-ec-grey-70 font-medium">Feld</th>
                      <th className="text-left py-1.5 text-ec-grey-70 font-medium">Wert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fieldEntries.map(([key, value]) => (
                      <tr key={key} className="border-b border-ec-grey-40 last:border-0">
                        <td className="py-1.5 pr-4 text-ec-grey-70">{key}</td>
                        <td className="py-1.5 text-ec-grey-80">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risk signals */}
          {signals.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-ec-grey-80 mb-2">Risikosignale</h4>
              <div className="space-y-2">
                {signals.map((signal, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant={severityVariant[signal.severity] ?? "neutral"}>
                      {signal.severity}
                    </Badge>
                    <span className="text-sm text-ec-grey-80">{signal.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fieldEntries.length === 0 && signals.length === 0 && (
            <p className="mt-4 text-sm text-ec-grey-70">Keine extrahierten Daten vorhanden.</p>
          )}
        </div>
      )}
    </Card>
  );
}

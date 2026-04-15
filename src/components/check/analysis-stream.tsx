"use client";

import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

export interface AnalysisEvent {
  type: string;
  message?: string;
  documentId?: string;
  fileName?: string;
  documentType?: string;
  confidence?: number;
  fieldsExtracted?: number;
  riskSignals?: number;
  step?: string;
  index?: number;
  total?: number;
}

interface AnalysisStreamProps {
  events: AnalysisEvent[];
  isAnalyzing: boolean;
}

function getDocumentLabel(documentType: string): string {
  const config = DOCUMENT_TYPES[documentType];
  return config?.labelDe ?? documentType;
}

function EventItem({ event }: { event: AnalysisEvent }) {
  switch (event.type) {
    case "document_classified":
      return (
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-ec-info"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span className="text-sm text-ec-grey-80">Klassifiziert als</span>
          <Badge variant="info">
            {event.documentType
              ? getDocumentLabel(event.documentType)
              : "Unbekannt"}
          </Badge>
          {event.confidence != null && (
            <span className="text-xs text-ec-grey-70">
              ({Math.round(event.confidence * 100)}%)
            </span>
          )}
        </div>
      );

    case "document_analyzed":
      return (
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-ec-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-ec-grey-80">
            {event.fieldsExtracted} Felder extrahiert
          </span>
          {event.riskSignals != null && event.riskSignals > 0 && (
            <Badge variant="warning">
              {event.riskSignals} Warnung{event.riskSignals > 1 ? "en" : ""}
            </Badge>
          )}
        </div>
      );

    case "error":
      return (
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-ec-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-ec-error">
            {event.message ?? "Unbekannter Fehler"}
          </span>
        </div>
      );

    case "status":
    default:
      return (
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-ec-info"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-ec-grey-80">
            {event.message ?? ""}
          </span>
        </div>
      );
  }
}

export function AnalysisStream({ events, isAnalyzing }: AnalysisStreamProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-ec-grey-80">Analyse-Log</h3>
        {isAnalyzing && (
          <svg
            className="h-4 w-4 animate-spin text-ec-dark-blue"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </div>

      {events.length === 0 && isAnalyzing && (
        <p className="text-sm text-ec-grey-70">Analyse wird vorbereitet...</p>
      )}

      <ul className="space-y-2">
        {events.map((event, index) => (
          <li key={index}>
            <EventItem event={event} />
          </li>
        ))}
      </ul>
    </div>
  );
}

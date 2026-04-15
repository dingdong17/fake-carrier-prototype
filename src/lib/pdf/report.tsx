import React from "react";
import ReactPDF from "@react-pdf/renderer";

const { Document, Page, Text, View, StyleSheet, Font } = ReactPDF;

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiA.woff2",
      fontWeight: 700,
    },
  ],
});

const colors = {
  primary: "#2649A5",
  grey: "#3B3B3B",
  lightGrey: "#979797",
  fieldBg: "#F7F7F7",
  white: "#FFFFFF",
};

const recommendationColors: Record<string, string> = {
  approve: "#005E47",
  review: "#EF6C00",
  warning: "#F75880",
  reject: "#E02E2A",
};

const recommendationLabels: Record<string, string> = {
  approve: "Freigabe empfohlen",
  review: "Manuelle Prüfung empfohlen",
  warning: "Warnung — erhöhtes Risiko",
  reject: "Ablehnung empfohlen",
};

const severityLabels: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
  info: "Info",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: colors.grey,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  coverPage: {
    fontFamily: "Inter",
    fontSize: 10,
    color: colors.grey,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  brandName: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 80,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
  },
  coverCarrier: {
    fontSize: 18,
    color: colors.grey,
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 11,
    color: colors.lightGrey,
    marginBottom: 6,
  },
  badge: {
    marginTop: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 10,
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  summaryLabel: {
    width: 140,
    fontWeight: 700,
    fontSize: 10,
    color: colors.lightGrey,
  },
  summaryValue: {
    flex: 1,
    fontSize: 10,
    color: colors.grey,
  },
  docHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primary,
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: colors.fieldBg,
  },
  tableLabel: {
    width: 160,
    fontWeight: 700,
    fontSize: 9,
    color: colors.grey,
  },
  tableValue: {
    flex: 1,
    fontSize: 9,
    color: colors.grey,
  },
  riskRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  riskSeverity: {
    width: 60,
    fontSize: 9,
    fontWeight: 700,
  },
  riskRule: {
    width: 140,
    fontSize: 9,
    color: colors.grey,
  },
  riskDescription: {
    flex: 1,
    fontSize: 9,
    color: colors.grey,
  },
  riskPoints: {
    width: 50,
    fontSize: 9,
    fontWeight: 700,
    color: colors.grey,
    textAlign: "right",
  },
  nextSteps: {
    marginTop: 20,
    padding: 12,
    backgroundColor: colors.fieldBg,
    borderRadius: 4,
  },
  nextStepsTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 8,
  },
  nextStepsItem: {
    fontSize: 9,
    color: colors.grey,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: colors.lightGrey,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGrey,
  },
});

export interface ReportProps {
  check: {
    checkNumber: string;
    carrierName: string;
    riskScore: number | null;
    confidenceLevel: number | null;
    recommendation: string | null;
    createdAt: string;
  };
  documents: Array<{
    documentType: string;
    fileName: string;
    extractedFields: Record<string, unknown> | null;
    riskSignals: Array<{
      severity: string;
      rule: string;
      description: string;
      points: number;
    }> | null;
    confidence: number | null;
  }>;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "#E02E2A";
    case "high":
      return "#F75880";
    case "medium":
      return "#EF6C00";
    case "low":
      return "#005E47";
    default:
      return colors.lightGrey;
  }
}

function CoverPage({ check }: { check: ReportProps["check"] }) {
  const recColor =
    recommendationColors[check.recommendation ?? ""] ?? colors.lightGrey;
  const recLabel =
    recommendationLabels[check.recommendation ?? ""] ?? "Nicht bewertet";

  return React.createElement(
    Page,
    { size: "A4", style: styles.coverPage },
    React.createElement(Text, { style: styles.brandName }, "Ecclesia Gruppe"),
    React.createElement(
      Text,
      { style: styles.coverTitle },
      "Frachtführer-Prüfbericht"
    ),
    React.createElement(
      Text,
      { style: styles.coverCarrier },
      check.carrierName
    ),
    React.createElement(
      Text,
      { style: styles.coverMeta },
      `Prüfnummer: ${check.checkNumber}`
    ),
    React.createElement(
      Text,
      { style: styles.coverMeta },
      `Datum: ${formatDate(check.createdAt)}`
    ),
    React.createElement(
      View,
      { style: { ...styles.badge, backgroundColor: recColor } },
      React.createElement(Text, { style: styles.badgeText }, recLabel)
    )
  );
}

function SummarySection({ check }: { check: ReportProps["check"] }) {
  return React.createElement(
    View,
    null,
    React.createElement(
      Text,
      { style: styles.sectionTitle },
      "Zusammenfassung"
    ),
    React.createElement(
      View,
      { style: styles.summaryRow },
      React.createElement(
        Text,
        { style: styles.summaryLabel },
        "Risikobewertung:"
      ),
      React.createElement(
        Text,
        { style: styles.summaryValue },
        check.riskScore !== null ? `${check.riskScore} / 100` : "—"
      )
    ),
    React.createElement(
      View,
      { style: styles.summaryRow },
      React.createElement(
        Text,
        { style: styles.summaryLabel },
        "Konfidenz:"
      ),
      React.createElement(
        Text,
        { style: styles.summaryValue },
        check.confidenceLevel !== null
          ? `${Math.round(check.confidenceLevel * 100)}%`
          : "—"
      )
    ),
    React.createElement(
      View,
      { style: styles.summaryRow },
      React.createElement(
        Text,
        { style: styles.summaryLabel },
        "Empfehlung:"
      ),
      React.createElement(
        Text,
        {
          style: {
            ...styles.summaryValue,
            color:
              recommendationColors[check.recommendation ?? ""] ?? colors.grey,
            fontWeight: 700,
          },
        },
        recommendationLabels[check.recommendation ?? ""] ?? "—"
      )
    )
  );
}

function DocumentList({ documents }: { documents: ReportProps["documents"] }) {
  return React.createElement(
    View,
    null,
    React.createElement(
      Text,
      { style: styles.sectionTitle },
      "Analysierte Dokumente"
    ),
    ...documents.map((doc, i) =>
      React.createElement(
        View,
        { key: i, style: styles.summaryRow },
        React.createElement(
          Text,
          { style: styles.summaryLabel },
          doc.documentType
        ),
        React.createElement(Text, { style: styles.summaryValue }, doc.fileName)
      )
    )
  );
}

function DocumentDetail({
  doc,
  index,
}: {
  doc: ReportProps["documents"][number];
  index: number;
}) {
  const fields = doc.extractedFields ?? {};
  const fieldEntries = Object.entries(fields);
  const signals = doc.riskSignals ?? [];

  return React.createElement(
    View,
    { break: index > 0 },
    React.createElement(
      Text,
      { style: styles.docHeader },
      `${doc.documentType} — ${doc.fileName}`
    ),
    doc.confidence !== null
      ? React.createElement(
          Text,
          {
            style: {
              fontSize: 9,
              color: colors.lightGrey,
              marginBottom: 8,
            },
          },
          `Dokumenten-Konfidenz: ${Math.round(doc.confidence * 100)}%`
        )
      : null,
    fieldEntries.length > 0
      ? React.createElement(
          View,
          { style: { marginBottom: 10 } },
          React.createElement(
            Text,
            {
              style: {
                fontSize: 10,
                fontWeight: 700,
                color: colors.grey,
                marginBottom: 4,
              },
            },
            "Extrahierte Felder"
          ),
          ...fieldEntries.map(([key, value], i) =>
            React.createElement(
              View,
              {
                key: i,
                style: {
                  ...styles.tableRow,
                  ...(i % 2 === 0 ? styles.tableRowAlt : {}),
                },
              },
              React.createElement(Text, { style: styles.tableLabel }, key),
              React.createElement(
                Text,
                { style: styles.tableValue },
                formatFieldValue(value)
              )
            )
          )
        )
      : null,
    signals.length > 0
      ? React.createElement(
          View,
          { style: { marginTop: 8 } },
          React.createElement(
            Text,
            {
              style: {
                fontSize: 10,
                fontWeight: 700,
                color: colors.grey,
                marginBottom: 4,
              },
            },
            "Risikosignale"
          ),
          React.createElement(
            View,
            {
              style: {
                ...styles.riskRow,
                borderBottomWidth: 1,
                borderBottomColor: colors.primary,
              },
            },
            React.createElement(
              Text,
              { style: { ...styles.riskSeverity, color: colors.primary } },
              "Schwere"
            ),
            React.createElement(
              Text,
              {
                style: {
                  ...styles.riskRule,
                  fontWeight: 700,
                  color: colors.primary,
                },
              },
              "Regel"
            ),
            React.createElement(
              Text,
              {
                style: {
                  ...styles.riskDescription,
                  fontWeight: 700,
                  color: colors.primary,
                },
              },
              "Beschreibung"
            ),
            React.createElement(
              Text,
              {
                style: {
                  ...styles.riskPoints,
                  color: colors.primary,
                },
              },
              "Punkte"
            )
          ),
          ...signals.map((signal, i) =>
            React.createElement(
              View,
              { key: i, style: styles.riskRow },
              React.createElement(
                Text,
                {
                  style: {
                    ...styles.riskSeverity,
                    color: severityColor(signal.severity),
                  },
                },
                severityLabels[signal.severity] ?? signal.severity
              ),
              React.createElement(
                Text,
                { style: styles.riskRule },
                signal.rule
              ),
              React.createElement(
                Text,
                { style: styles.riskDescription },
                signal.description
              ),
              React.createElement(
                Text,
                { style: styles.riskPoints },
                String(signal.points)
              )
            )
          )
        )
      : null
  );
}

function NextSteps() {
  return React.createElement(
    View,
    { style: styles.nextSteps },
    React.createElement(
      Text,
      { style: styles.nextStepsTitle },
      "Nächste Schritte"
    ),
    React.createElement(
      Text,
      { style: styles.nextStepsItem },
      "• Bei Freigabe: Frachtführer in das System aufnehmen und Versicherungsnachweis archivieren."
    ),
    React.createElement(
      Text,
      { style: styles.nextStepsItem },
      "• Bei manueller Prüfung: Fehlende oder auffällige Dokumente vom Frachtführer anfordern."
    ),
    React.createElement(
      Text,
      { style: styles.nextStepsItem },
      "• Bei Warnung/Ablehnung: Risikobewertung mit dem zuständigen Underwriter besprechen."
    ),
    React.createElement(
      Text,
      { style: styles.nextStepsItem },
      "• Alle Prüfberichte werden für Audit-Zwecke automatisch archiviert."
    )
  );
}

function AuditFooter({ createdAt }: { createdAt: string }) {
  return React.createElement(
    View,
    { style: styles.footer, fixed: true },
    React.createElement(
      Text,
      { style: styles.footerText },
      `Erstellt am: ${formatTimestamp(createdAt)} | Ecclesia Gruppe — Frachtführer-Prüfung`
    ),
    React.createElement(
      Text,
      { style: { ...styles.footerText, marginTop: 2 } },
      "Dieser Bericht wurde automatisch erstellt und dient ausschließlich zu Informationszwecken. Er stellt keine rechtsverbindliche Bewertung dar."
    )
  );
}

export function CarrierReport({ check, documents }: ReportProps) {
  return React.createElement(
    Document,
    null,
    React.createElement(CoverPage, { check }),
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(SummarySection, { check }),
      React.createElement(DocumentList, { documents }),
      ...documents.map((doc, i) =>
        React.createElement(DocumentDetail, { key: i, doc, index: i })
      ),
      React.createElement(NextSteps, null),
      React.createElement(AuditFooter, { createdAt: check.createdAt })
    )
  );
}

import type { AnalysisOutput } from "../providers/types";

export function buildChatPrompt(analysisOutput: AnalysisOutput): string {
  return `Du bist der Frachtführer-Prüfungsassistent. Der Nutzer hat eine Prüfung durchgeführt und hat Fragen.

PRÜFERGEBNIS:
- Risikoscore: ${analysisOutput.riskScore}/100
- Vertrauensniveau: ${analysisOutput.confidenceLevel}%
- Empfehlung: ${analysisOutput.recommendation}
- Erklärung: ${analysisOutput.explanation}

GEPRÜFTE DOKUMENTE:
${analysisOutput.documentResults.map((r) => `- ${r.documentType}: ${Object.keys(r.extraction.fields).length} Felder, ${r.extraction.riskSignals.length} Signale`).join("\n")}

RISIKOSIGNALE:
${analysisOutput.documentResults.flatMap((r) => r.extraction.riskSignals.map((s) => `- [${s.severity}] ${s.description} (${s.rule}, ${s.points} Punkte)`)).join("\n")}

NÄCHSTE SCHRITTE:
${analysisOutput.nextSteps.map((s) => `- ${s}`).join("\n")}

REGELN:
- Verwende IMMER das Dreistufige Leitmodell
- Schlage konkrete nächste Schritte vor
- Gib KEINE Rechtsberatung`;
}

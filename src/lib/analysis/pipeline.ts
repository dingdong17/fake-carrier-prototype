import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { checks, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { classifyDocument, claudeDocumentProvider } from "./providers/claude-document";
import { buildCrossCheckPrompt } from "./prompts/cross-check";
import { SYSTEM_PROMPT } from "./prompts/system";
import {
  calculateRiskScore,
  calculateConfidenceLevel,
  determineRecommendation,
  getRiskLevel,
  generateGuidance,
} from "./scoring";
import type {
  AnalysisOutput,
  ProviderResult,
  CrossCheckResult,
} from "./providers/types";

const client = new Anthropic();

function parseJsonResponse(text: string): Record<string, unknown> {
  const match = text.match(/{[\s\S]*}/);
  if (!match) {
    throw new Error("No JSON object found in response");
  }
  return JSON.parse(match[0]) as Record<string, unknown>;
}

async function runCrossCheck(
  documentResults: ProviderResult[]
): Promise<CrossCheckResult> {
  if (documentResults.length < 2) {
    return { consistencyScore: 1.0, mismatches: [], patterns: [] };
  }

  const extractedData = documentResults.map((r) => ({
    documentType: r.documentType,
    fields: r.extraction.fields,
  }));

  const prompt = buildCrossCheckPrompt(extractedData);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from cross-check");
  }

  const parsed = parseJsonResponse(textBlock.text);

  return {
    consistencyScore: (parsed.consistencyScore as number) || 0,
    mismatches:
      ((parsed.mismatches as CrossCheckResult["mismatches"]) || []).map(
        (m) => ({
          field: m.field || "",
          documents: m.documents || [],
          values: m.values || [],
          severity: m.severity || "minor",
          description: m.description || "",
        })
      ),
    patterns: (parsed.patterns as string[]) || [],
  };
}

function generateExplanation(
  riskScore: number,
  recommendation: string,
  documentResults: ProviderResult[],
  crossCheck: CrossCheckResult
): string {
  const riskLevel = getRiskLevel(riskScore);
  const totalSignals = documentResults.reduce(
    (sum, r) => sum + r.extraction.riskSignals.length,
    0
  );
  const criticalSignals = documentResults.reduce(
    (sum, r) =>
      sum +
      r.extraction.riskSignals.filter((s) => s.severity === "critical").length,
    0
  );

  let explanation = `Risikoanalyse: ${riskLevel === "low" ? "Niedriges" : riskLevel === "medium" ? "Mittleres" : "Hohes"} Risiko (Score: ${riskScore}/100). `;
  explanation += `${documentResults.length} Dokument(e) geprüft, ${totalSignals} Risikosignal(e) erkannt`;

  if (criticalSignals > 0) {
    explanation += ` (davon ${criticalSignals} kritisch)`;
  }
  explanation += ". ";

  if (crossCheck.mismatches.length > 0) {
    explanation += `${crossCheck.mismatches.length} dokumentübergreifende Inkonsistenz(en) gefunden. `;
  }

  const recommendationLabels: Record<string, string> = {
    approve: "Freigabe empfohlen",
    review: "Manuelle Prüfung empfohlen",
    warning: "Warnung — erhöhtes Risiko",
    reject: "Ablehnung empfohlen",
  };
  explanation += `Empfehlung: ${recommendationLabels[recommendation] || recommendation}.`;

  return explanation;
}

function generateNextSteps(
  recommendation: string,
  documentResults: ProviderResult[],
  crossCheck: CrossCheckResult
): string[] {
  const steps: string[] = [];

  const hasCritical = documentResults.some((r) =>
    r.extraction.riskSignals.some((s) => s.severity === "critical")
  );

  if (hasCritical) {
    steps.push(
      "Kritische Risikosignale sofort prüfen und ggf. Frachtführer kontaktieren"
    );
  }

  if (crossCheck.mismatches.length > 0) {
    steps.push(
      "Dokumentübergreifende Inkonsistenzen klären — Frachtführer um Stellungnahme bitten"
    );
  }

  const missingFieldDocs = documentResults.filter(
    (r) => r.extraction.missingFields.length > 0
  );
  if (missingFieldDocs.length > 0) {
    steps.push("Fehlende Dokumentfelder nachfordern");
  }

  steps.push("Versicherungsschutz telefonisch beim Versicherer bestätigen");
  steps.push("Festnetznummer des Unternehmens durch Rückruf verifizieren");

  if (recommendation === "reject") {
    steps.push(
      "Bei Ablehnung: Alternative Frachtführer prüfen und Vorfall dokumentieren"
    );
  }

  return steps;
}

export async function runAnalysisPipeline(
  checkId: string
): Promise<AnalysisOutput> {
  // Step 1: Load check and documents from DB
  const check = db
    .select()
    .from(checks)
    .where(eq(checks.id, checkId))
    .get();

  if (!check) {
    throw new Error(`Check not found: ${checkId}`);
  }

  const checkDocuments = db
    .select()
    .from(documents)
    .where(eq(documents.checkId, checkId))
    .all();

  if (checkDocuments.length === 0) {
    throw new Error(`No documents found for check: ${checkId}`);
  }

  // Update check status to analyzing
  db.update(checks)
    .set({ status: "analyzing", updatedAt: new Date().toISOString() })
    .where(eq(checks.id, checkId))
    .run();

  const carrierInfo = {
    name: check.carrierName,
    country: check.carrierCountry || undefined,
    vatId: check.carrierVatId || undefined,
  };

  // Step 2: Classify each document
  for (const doc of checkDocuments) {
    if (doc.documentType === "unknown" || !doc.documentType) {
      try {
        const classification = await classifyDocument(
          doc.filePath,
          doc.mimeType
        );
        db.update(documents)
          .set({ documentType: classification.documentType })
          .where(eq(documents.id, doc.id))
          .run();
        doc.documentType = classification.documentType;
      } catch {
        // Keep existing type if classification fails
      }
    }
  }

  // Step 3: Analyze each document
  const documentResults: ProviderResult[] = [];
  for (const doc of checkDocuments) {
    try {
      db.update(documents)
        .set({ status: "analyzing" })
        .where(eq(documents.id, doc.id))
        .run();

      const result = await claudeDocumentProvider.analyze(
        doc.filePath,
        doc.documentType,
        doc.mimeType,
        carrierInfo
      );

      documentResults.push(result);

      db.update(documents)
        .set({
          status: "analyzed",
          extractedFields: result.extraction.fields as Record<string, unknown>,
          riskSignals: result.extraction.riskSignals as unknown as Record<string, unknown>,
          confidence: result.extraction.confidence,
        })
        .where(eq(documents.id, doc.id))
        .run();
    } catch {
      db.update(documents)
        .set({ status: "error" })
        .where(eq(documents.id, doc.id))
        .run();
    }
  }

  // Step 4: Cross-document consistency check
  const crossCheck = await runCrossCheck(documentResults);

  // Step 5: Score with the scoring engine
  const riskScore = calculateRiskScore(documentResults, crossCheck);
  const confidenceLevel = calculateConfidenceLevel(documentResults);
  const recommendation = determineRecommendation(riskScore, confidenceLevel);

  // Step 6: Generate explanation and guidance
  const explanation = generateExplanation(
    riskScore,
    recommendation,
    documentResults,
    crossCheck
  );
  const nextSteps = generateNextSteps(
    recommendation,
    documentResults,
    crossCheck
  );
  const guidance = generateGuidance(documentResults, crossCheck);

  // Step 7: Update DB with final results
  db.update(checks)
    .set({
      riskScore,
      confidenceLevel,
      recommendation,
      status: "completed",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(checks.id, checkId))
    .run();

  // Step 8: Return AnalysisOutput
  const output: AnalysisOutput = {
    checkId,
    documentResults,
    crossCheck,
    riskScore,
    confidenceLevel,
    recommendation,
    explanation,
    nextSteps,
    guidance,
  };

  return output;
}

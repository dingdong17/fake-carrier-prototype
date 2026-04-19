import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checks, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { classifyDocument } from "@/lib/analysis/providers/azure-document";
import {
  calculateRiskScore,
  calculateConfidenceLevel,
  determineRecommendation,
  generateGuidance,
} from "@/lib/analysis/scoring";
import {
  analyzeDocumentWithForensics,
  runCrossCheck,
} from "@/lib/analysis/pipeline";
import type { ProviderResult } from "@/lib/analysis/providers/types";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  let body: { checkId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { checkId } = body;
  if (!checkId) {
    return new Response(
      JSON.stringify({ error: "checkId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const check = db
    .select()
    .from(checks)
    .where(eq(checks.id, checkId))
    .get();

  if (!check) {
    return new Response(
      JSON.stringify({ error: "Check not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Carrier name is optional — AI can analyze documents without it
  // The name may be extracted from documents or filled later

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      try {
        // Load documents
        const checkDocuments = db
          .select()
          .from(documents)
          .where(eq(documents.checkId, checkId))
          .all();

        if (checkDocuments.length === 0) {
          sendEvent({ type: "error", message: "No documents found for this check" });
          controller.close();
          return;
        }

        // Update check status to analyzing
        db.update(checks)
          .set({ status: "analyzing", updatedAt: new Date().toISOString() })
          .where(eq(checks.id, checkId))
          .run();

        sendEvent({
          type: "status",
          message: "Analyse gestartet",
          step: "start",
        });

        const carrierInfo = {
          name: check.carrierName,
          country: check.carrierCountry || undefined,
          vatId: check.carrierVatId || undefined,
        };

        const documentResults: ProviderResult[] = [];
        const total = checkDocuments.length;

        // Step 1: Classify and analyze each document
        for (let i = 0; i < checkDocuments.length; i++) {
          const doc = checkDocuments[i];

          sendEvent({
            type: "document_start",
            documentId: doc.id,
            fileName: doc.fileName,
            index: i + 1,
            total,
          });

          // Classify if unknown
          if (doc.documentType === "unknown" || !doc.documentType) {
            try {
              sendEvent({
                type: "status",
                message: `Dokument ${i + 1}/${total} wird klassifiziert...`,
                step: "classify",
              });

              const classification = await classifyDocument(
                doc.filePath,
                doc.mimeType
              );

              db.update(documents)
                .set({ documentType: classification.documentType })
                .where(eq(documents.id, doc.id))
                .run();

              doc.documentType = classification.documentType;

              sendEvent({
                type: "document_classified",
                documentId: doc.id,
                documentType: classification.documentType,
                confidence: classification.confidence,
              });
            } catch {
              // Keep existing type if classification fails
            }
          }

          // Analyze document
          try {
            sendEvent({
              type: "status",
              message: `Dokument ${i + 1}/${total} wird analysiert...`,
              step: "analyze",
            });

            db.update(documents)
              .set({ status: "analyzing" })
              .where(eq(documents.id, doc.id))
              .run();

            const result = await analyzeDocumentWithForensics(
              doc.filePath,
              doc.documentType,
              doc.mimeType,
              carrierInfo
            );

            documentResults.push(result);

            db.update(documents)
              .set({
                status: "analyzed",
                extractedFields: result.extraction.fields as Record<
                  string,
                  unknown
                >,
                riskSignals: result.extraction
                  .riskSignals as unknown as Record<string, unknown>,
                confidence: result.extraction.confidence,
              })
              .where(eq(documents.id, doc.id))
              .run();

            sendEvent({
              type: "document_analyzed",
              documentId: doc.id,
              documentType: result.documentType,
              fieldsExtracted: Object.keys(result.extraction.fields).length,
              riskSignals: result.extraction.riskSignals.length,
              confidence: result.extraction.confidence,
            });
          } catch {
            db.update(documents)
              .set({ status: "error" })
              .where(eq(documents.id, doc.id))
              .run();

            sendEvent({
              type: "status",
              message: `Fehler bei Dokument ${i + 1}/${total}`,
              step: "error",
            });
          }
        }

        // Step 2: Cross-document consistency check (skipped for Quick tier)
        const skippedChecks: string[] = [];
        let crossCheck;
        if (check.testSet === "quick") {
          skippedChecks.push("cross-document-consistency");
          crossCheck = {
            consistencyScore: 1.0,
            mismatches: [],
            patterns: [],
          };
          sendEvent({
            type: "status",
            message: "Konsistenzprüfung übersprungen (Schnell-Modus)",
            step: "cross_check_skipped",
          });
        } else {
          sendEvent({
            type: "status",
            message: "Dokumentübergreifende Konsistenzprüfung...",
            step: "cross_check",
          });
          crossCheck = await runCrossCheck(documentResults);
        }

        // Step 3: Compute scores
        sendEvent({
          type: "status",
          message: "Risikobewertung wird berechnet...",
          step: "scoring",
        });

        const riskScore = calculateRiskScore(documentResults, crossCheck);
        const confidenceLevel = calculateConfidenceLevel(documentResults);
        const recommendation = determineRecommendation(
          riskScore,
          confidenceLevel
        );

        // Step 4: Generate guidance and next steps
        const guidance = generateGuidance(documentResults, crossCheck);

        const nextSteps: string[] = [];
        const hasCritical = documentResults.some((r) =>
          r.extraction.riskSignals.some((s) => s.severity === "critical")
        );
        if (hasCritical) {
          nextSteps.push(
            "Kritische Risikosignale sofort prüfen und ggf. Frachtführer kontaktieren"
          );
        }
        if (crossCheck.mismatches.length > 0) {
          nextSteps.push(
            "Dokumentübergreifende Inkonsistenzen klären — Frachtführer um Stellungnahme bitten"
          );
        }
        const missingFieldDocs = documentResults.filter(
          (r) => r.extraction.missingFields.length > 0
        );
        if (missingFieldDocs.length > 0) {
          nextSteps.push("Fehlende Dokumentfelder nachfordern");
        }
        nextSteps.push(
          "Versicherungsschutz telefonisch beim Versicherer bestätigen"
        );
        nextSteps.push(
          "Festnetznummer des Unternehmens durch Rückruf verifizieren"
        );
        if (recommendation === "reject") {
          nextSteps.push(
            "Bei Ablehnung: Alternative Frachtführer prüfen und Vorfall dokumentieren"
          );
        }

        // Step 5: Update DB with final results
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

        // Send completed event
        sendEvent({
          type: "completed",
          riskScore,
          confidenceLevel,
          recommendation,
          nextSteps,
          guidance,
        });

        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        sendEvent({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

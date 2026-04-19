import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { classifyDocument } from "@/lib/analysis/providers/azure-document";
import { analyzeDocumentWithForensics } from "@/lib/analysis/pipeline";
import { logEvent } from "@/lib/analytics";

export const maxDuration = 180;

export async function POST(request: NextRequest) {
  const requestStart = Date.now();

  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    const doc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .get();

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    await logEvent("classify.start", {
      documentId,
      meta: { fileName: doc.fileName },
    });

    const classification = await classifyDocument(doc.filePath, doc.mimeType);
    const classifyMs = classification.timing.totalMs;

    await logEvent("classify.done", {
      documentId,
      durationMs: classifyMs,
      meta: {
        fileName: doc.fileName,
        documentType: classification.documentType,
        fileSizeKB: classification.timing.fileSizeKB,
        apiCallMs: classification.timing.apiCallMs,
      },
    });

    await db.update(documents)
      .set({ documentType: classification.documentType })
      .where(eq(documents.id, documentId))
      .run();

    let extractedData: Record<string, unknown> | null = null;
    let extractMs = 0;

    if (classification.documentType !== "unknown") {
      const extractStart = Date.now();

      await logEvent("extract.start", {
        documentId,
        meta: {
          fileName: doc.fileName,
          documentType: classification.documentType,
          fileSizeKB: classification.timing.fileSizeKB,
        },
      });

      const result = await analyzeDocumentWithForensics(
        doc.filePath,
        classification.documentType,
        doc.mimeType,
        { name: "" }
      );

      extractMs = Date.now() - extractStart;
      extractedData = result.extraction.fields;
      const fieldCount = Object.keys(extractedData).length;
      const signalCount = result.extraction.riskSignals.length;

      await logEvent("extract.done", {
        documentId,
        durationMs: extractMs,
        meta: {
          fileName: doc.fileName,
          fieldCount,
          signalCount,
        },
      });

      await db.update(documents)
        .set({
          extractedFields: extractedData as Record<string, unknown>,
          riskSignals: result.extraction.riskSignals as unknown as Record<string, unknown>,
          confidence: result.extraction.confidence,
          status: "analyzed",
        })
        .where(eq(documents.id, documentId))
        .run();
    }

    const totalMs = Date.now() - requestStart;
    await logEvent("classify.complete", {
      documentId,
      durationMs: totalMs,
      meta: {
        fileName: doc.fileName,
        classifyMs,
        extractMs,
      },
    });

    return NextResponse.json({
      documentId,
      documentType: classification.documentType,
      classificationConfidence: classification.confidence,
      extractedData,
      timing: {
        ...classification.timing,
        extractMs,
        totalRequestMs: totalMs,
      },
    });
  } catch (error) {
    const totalMs = Date.now() - requestStart;
    const errMsg = error instanceof Error ? error.message : "Classification failed";
    await logEvent("classify.error", {
      durationMs: totalMs,
      meta: { error: errMsg },
    });

    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}

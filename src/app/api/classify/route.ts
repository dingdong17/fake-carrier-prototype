import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { classifyDocument } from "@/lib/analysis/providers/claude-document";
import { claudeDocumentProvider } from "@/lib/analysis/providers/claude-document";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

function logAnalytics(message: string) {
  const logDir = path.join(process.cwd(), "logs");
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, "analytics.log");
  const timestamp = new Date().toISOString();
  appendFileSync(logPath, `${timestamp} | ${message}\n`);
}

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

    const doc = db
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

    logAnalytics(`START classify | file=${doc.fileName} | docId=${documentId}`);

    // Step 1: Classify the document
    const classification = await classifyDocument(doc.filePath, doc.mimeType);
    const classifyMs = classification.timing.totalMs;

    logAnalytics(`CLASSIFY done | file=${doc.fileName} | type=${classification.documentType} | ${classification.timing.fileSizeKB}KB | classifyApi=${classification.timing.apiCallMs}ms | total=${classifyMs}ms`);

    // Update document type in DB
    db.update(documents)
      .set({ documentType: classification.documentType })
      .where(eq(documents.id, documentId))
      .run();

    // Step 2: Extract fields from recognized document types
    let extractedData: Record<string, unknown> | null = null;
    let extractMs = 0;

    if (classification.documentType !== "unknown") {
      const extractStart = Date.now();

      logAnalytics(`EXTRACT start | file=${doc.fileName} | type=${classification.documentType} | ${classification.timing.fileSizeKB}KB`);

      const result = await claudeDocumentProvider.analyze(
        doc.filePath,
        classification.documentType,
        doc.mimeType,
        { name: "" }
      );

      extractMs = Date.now() - extractStart;
      extractedData = result.extraction.fields;
      const fieldCount = Object.keys(extractedData).length;
      const signalCount = result.extraction.riskSignals.length;

      logAnalytics(`EXTRACT done | file=${doc.fileName} | fields=${fieldCount} | signals=${signalCount} | extractApi=${extractMs}ms`);

      // Save extraction to document record
      db.update(documents)
        .set({
          extractedFields: extractedData as any,
          confidence: result.extraction.confidence,
          status: "analyzed",
        })
        .where(eq(documents.id, documentId))
        .run();
    }

    const totalMs = Date.now() - requestStart;
    logAnalytics(`COMPLETE | file=${doc.fileName} | classify=${classifyMs}ms | extract=${extractMs}ms | total=${totalMs}ms`);

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
    logAnalytics(`ERROR | ${errMsg} | elapsed=${totalMs}ms`);

    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}

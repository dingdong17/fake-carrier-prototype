import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { classifyDocument } from "@/lib/analysis/providers/claude-document";
import { claudeDocumentProvider } from "@/lib/analysis/providers/claude-document";

export async function POST(request: NextRequest) {
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

    // Step 1: Classify the document
    const classification = await classifyDocument(doc.filePath, doc.mimeType);

    // Update document type in DB
    db.update(documents)
      .set({ documentType: classification.documentType })
      .where(eq(documents.id, documentId))
      .run();

    // Step 2: Extract fields from recognized document types
    let extractedData: Record<string, unknown> | null = null;

    if (classification.documentType !== "unknown") {
      const result = await claudeDocumentProvider.analyze(
        doc.filePath,
        classification.documentType,
        doc.mimeType,
        { name: "" } // no carrier name yet, extraction still works
      );

      extractedData = result.extraction.fields;

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

    return NextResponse.json({
      documentId,
      documentType: classification.documentType,
      classificationConfidence: classification.confidence,
      extractedData,
      timing: classification.timing,
    });
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Classification failed" },
      { status: 500 }
    );
  }
}

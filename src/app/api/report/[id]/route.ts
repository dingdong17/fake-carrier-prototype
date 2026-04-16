import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checks, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateReport } from "@/lib/pdf/generate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const check = db.select().from(checks).where(eq(checks.id, id)).get();

  if (!check) {
    return NextResponse.json({ error: "Check not found" }, { status: 404 });
  }

  const docs = db
    .select()
    .from(documents)
    .where(eq(documents.checkId, id))
    .all();

  const reportDocs = docs.map((doc) => ({
    documentType: doc.documentType,
    fileName: doc.fileName,
    extractedFields: doc.extractedFields as Record<string, unknown> | null,
    riskSignals: doc.riskSignals as Array<{
      severity: string;
      rule: string;
      description: string;
      points: number;
    }> | null,
    confidence: doc.confidence,
  }));

  const pdfBuffer = await generateReport(
    {
      checkNumber: check.checkNumber,
      carrierName: check.carrierName,
      riskScore: check.riskScore,
      confidenceLevel: check.confidenceLevel,
      recommendation: check.recommendation,
      createdAt: check.createdAt,
    },
    reportDocs
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${check.checkNumber}-${check.carrierName}.pdf"`,
    },
  });
}

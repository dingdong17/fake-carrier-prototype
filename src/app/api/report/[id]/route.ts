import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateReport } from "@/lib/pdf/generate";
import { auth } from "@/lib/auth/config";
import { AuthError } from "@/lib/auth/session";
import { requireCheckScope } from "@/lib/auth/scope-check";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const checkId = id;

  let scope;
  try {
    scope = await requireCheckScope(session.user, checkId);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Not found" }, { status: 404 });
  }
  const { check } = scope;

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.checkId, checkId))
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

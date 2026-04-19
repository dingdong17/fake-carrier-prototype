import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { documents, checks } from "@/lib/db/schema";
import { generateId, formatCheckNumber } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const files = formData.getAll("files") as File[];
    const checkId = formData.get("checkId") as string | null;
    const carrierName = formData.get("carrierName") as string | null;
    const carrierCountry = formData.get("carrierCountry") as string | null;
    const carrierVatId = formData.get("carrierVatId") as string | null;
    const testSetRaw = formData.get("testSet") as string | null;
    const testSet: "quick" | "medium" | "full" =
      testSetRaw === "quick" || testSetRaw === "full" ? testSetRaw : "medium";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    let resolvedCheckId: string;
    let checkNumber: string;

    if (checkId) {
      // Existing check — verify it exists
      const existing = db
        .select()
        .from(checks)
        .where(eq(checks.id, checkId))
        .get();

      if (!existing) {
        return NextResponse.json(
          { error: "Check not found" },
          { status: 404 }
        );
      }

      resolvedCheckId = checkId;
      checkNumber = existing.checkNumber;

      // Update carrier info if provided
      if (carrierName) {
        db.update(checks)
          .set({
            carrierName,
            carrierCountry: carrierCountry || existing.carrierCountry,
            carrierVatId: carrierVatId || existing.carrierVatId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(checks.id, checkId))
          .run();
      }
    } else {
      // Create a new check — carrier name can be filled later (e.g. from AI extraction)
      resolvedCheckId = generateId();
      const result = db
        .select({ maxNum: sql<string>`max(check_number)` })
        .from(checks)
        .get();
      // Extract sequence from "FC-009" → 9, then increment
      const lastNum = result?.maxNum ? parseInt(result.maxNum.replace("FC-", ""), 10) : 0;
      const seq = (isNaN(lastNum) ? 0 : lastNum) + 1;
      checkNumber = formatCheckNumber(seq);

      db.insert(checks)
        .values({
          id: resolvedCheckId,
          checkNumber,
          carrierName: carrierName || "Unbekannt",
          carrierCountry: carrierCountry || null,
          carrierVatId: carrierVatId || null,
          status: "draft",
          testSet,
        })
        .run();
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "uploads", resolvedCheckId);
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Save files and create document records
    const savedDocuments: Array<{
      id: string;
      fileName: string;
      filePath: string;
      mimeType: string;
      documentType: string;
      status: string;
    }> = [];

    for (const file of files) {
      const docId = generateId();
      const ext = path.extname(file.name) || ".bin";
      const savedFileName = `${docId}${ext}`;
      const filePath = path.join(uploadDir, savedFileName);

      // Read file content and write to disk
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      writeFileSync(filePath, buffer);

      // Create document record
      db.insert(documents)
        .values({
          id: docId,
          checkId: resolvedCheckId,
          documentType: "unknown",
          fileName: file.name,
          filePath,
          mimeType: file.type || "application/octet-stream",
          status: "uploaded",
        })
        .run();

      savedDocuments.push({
        id: docId,
        fileName: file.name,
        filePath,
        mimeType: file.type || "application/octet-stream",
        documentType: "unknown",
        status: "uploaded",
      });
    }

    return NextResponse.json({
      checkId: resolvedCheckId,
      checkNumber,
      documents: savedDocuments,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}

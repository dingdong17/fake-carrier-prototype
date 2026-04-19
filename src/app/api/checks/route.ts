import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checks, documents, chatMessages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { rmSync, existsSync } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      const check = await db
        .select()
        .from(checks)
        .where(eq(checks.id, id))
        .get();

      if (!check) {
        return NextResponse.json(
          { error: "Check not found" },
          { status: 404 }
        );
      }

      const checkDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.checkId, id))
        .all();

      return NextResponse.json({ check, documents: checkDocuments });
    }

    const allChecks = await db
      .select()
      .from(checks)
      .orderBy(desc(checks.createdAt))
      .all();

    return NextResponse.json({ checks: allChecks });
  } catch (error) {
    console.error("Checks API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checks" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Delete related records first (foreign key constraints)
    await db.delete(chatMessages).where(eq(chatMessages.checkId, id)).run();
    await db.delete(documents).where(eq(documents.checkId, id)).run();
    await db.delete(checks).where(eq(checks.id, id)).run();

    // Delete uploaded files
    const uploadDir = path.join(process.cwd(), "uploads", id);
    if (existsSync(uploadDir)) {
      rmSync(uploadDir, { recursive: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete check error:", error);
    return NextResponse.json(
      { error: "Failed to delete check" },
      { status: 500 }
    );
  }
}

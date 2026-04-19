import { NextRequest, NextResponse } from "next/server";
import { rmSync } from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checks, documents, chatMessages } from "@/lib/db/schema";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const check = db.select().from(checks).where(eq(checks.id, id)).get();
  if (!check) {
    return NextResponse.json({ error: "Check not found" }, { status: 404 });
  }

  if (check.status === "completed") {
    return NextResponse.json(
      { error: "Completed checks cannot be discarded via this endpoint" },
      { status: 400 }
    );
  }

  db.delete(chatMessages).where(eq(chatMessages.checkId, id)).run();
  db.delete(documents).where(eq(documents.checkId, id)).run();
  db.delete(checks).where(eq(checks.id, id)).run();

  const uploadDir = path.join(process.cwd(), "uploads", id);
  try {
    rmSync(uploadDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`[discard] failed to remove ${uploadDir}: ${err}`);
  }

  return NextResponse.json({ success: true });
}

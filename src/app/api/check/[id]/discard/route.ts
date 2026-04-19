import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checks, documents, chatMessages } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";

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

  try {
    await getStorage().deletePrefix(`checks/${id}`);
  } catch (err) {
    console.warn(`[discard] deletePrefix failed for checks/${id}: ${err}`);
  }

  return NextResponse.json({ success: true });
}

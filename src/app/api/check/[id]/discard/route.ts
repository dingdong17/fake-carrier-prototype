import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checks, documents, chatMessages } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { auth } from "@/lib/auth/config";
import { AuthError } from "@/lib/auth/session";
import { requireCheckScope } from "@/lib/auth/scope-check";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let scope;
  try {
    scope = await requireCheckScope(session.user, id);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Not found" }, { status: 404 });
  }
  const { check } = scope;

  if (check.status === "completed") {
    return NextResponse.json(
      { error: "Completed checks cannot be discarded via this endpoint" },
      { status: 400 }
    );
  }

  await db.delete(chatMessages).where(eq(chatMessages.checkId, id)).run();
  await db.delete(documents).where(eq(documents.checkId, id)).run();
  await db.delete(checks).where(eq(checks.id, id)).run();

  try {
    await getStorage().deletePrefix(`checks/${id}`);
  } catch (err) {
    console.warn(`[discard] deletePrefix failed for checks/${id}: ${err}`);
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { webinarRegistrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_STATUS = new Set(["pending_confirm", "confirmed", "waitlist", "cancelled"]);

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status;
  if (typeof status !== "string" || !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  await db
    .update(webinarRegistrations)
    .set({ status: status as "pending_confirm" | "confirmed" | "waitlist" | "cancelled" })
    .where(eq(webinarRegistrations.id, id));
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { webinarSlots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (typeof body.startsAt === "string") {
    updates.startsAt = new Date(body.startsAt).toISOString();
  }
  if (typeof body.endsAt === "string") {
    updates.endsAt = new Date(body.endsAt).toISOString();
  }
  if (typeof body.maxAttendees === "number" && body.maxAttendees >= 1) {
    updates.maxAttendees = body.maxAttendees;
  }
  if (typeof body.isActive === "boolean") {
    updates.isActive = body.isActive;
  }
  if (typeof body.notes === "string" || body.notes === null) {
    updates.notes = body.notes;
  }
  if (typeof body.timezone === "string" && body.timezone) {
    updates.timezone = body.timezone;
  }

  if (
    updates.startsAt &&
    updates.endsAt &&
    new Date(updates.startsAt as string) >= new Date(updates.endsAt as string)
  ) {
    return NextResponse.json({ error: "ends_before_starts" }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  await db.update(webinarSlots).set(updates).where(eq(webinarSlots.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  await db.delete(webinarSlots).where(eq(webinarSlots.id, id));
  return NextResponse.json({ ok: true });
}

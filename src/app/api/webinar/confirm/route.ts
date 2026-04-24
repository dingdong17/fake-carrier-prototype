import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webinarRegistrations, webinarSlots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isTokenExpired } from "@/lib/webinar/tokens";
import { countConfirmed } from "@/lib/webinar/slots";

/**
 * GET /api/webinar/confirm?token=...
 * Consumes a confirmation token. Idempotent on repeat calls:
 * already-confirmed or already-waitlisted registrations return their
 * current state instead of erroring.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const reg = await db
    .select()
    .from(webinarRegistrations)
    .where(eq(webinarRegistrations.confirmToken, token))
    .get();
  if (!reg)
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  if (reg.status === "confirmed" || reg.status === "waitlist") {
    const slot = await db
      .select()
      .from(webinarSlots)
      .where(eq(webinarSlots.id, reg.slotId))
      .get();
    return NextResponse.json({
      status: reg.status,
      slot: slot ?? null,
      registration: { name: reg.name, email: reg.email },
    });
  }

  if (reg.status === "cancelled") {
    return NextResponse.json({ error: "cancelled" }, { status: 410 });
  }

  const expiresMs =
    reg.confirmTokenExpires instanceof Date
      ? reg.confirmTokenExpires.getTime()
      : Number(reg.confirmTokenExpires);
  if (isTokenExpired(expiresMs)) {
    return NextResponse.json({ error: "token_expired" }, { status: 410 });
  }

  const slot = await db
    .select()
    .from(webinarSlots)
    .where(eq(webinarSlots.id, reg.slotId))
    .get();
  if (!slot || !slot.isActive) {
    return NextResponse.json({ error: "slot_inactive" }, { status: 410 });
  }

  const confirmedCount = await countConfirmed(reg.slotId);
  const nextStatus: "confirmed" | "waitlist" =
    confirmedCount < slot.maxAttendees ? "confirmed" : "waitlist";

  await db
    .update(webinarRegistrations)
    .set({
      status: nextStatus,
      confirmedAt: new Date().toISOString(),
    })
    .where(eq(webinarRegistrations.id, reg.id));

  return NextResponse.json({
    status: nextStatus,
    slot,
    registration: { name: reg.name, email: reg.email },
  });
}

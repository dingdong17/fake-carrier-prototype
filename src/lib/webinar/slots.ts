import { db } from "@/lib/db";
import { webinarSlots, webinarRegistrations } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export type PublicSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  maxAttendees: number;
  confirmedCount: number;
  remaining: number;
  isFull: boolean;
};

/**
 * List all active slots with live confirmed-seat counts.
 * "Remaining" is based on confirmed registrations only — pending-confirm
 * rows don't reserve seats (soft waiting list per product decision).
 *
 * Degrades gracefully to [] on any DB error (e.g. missing tables during
 * an incremental migration rollout) so the public landing always renders
 * — the UI shows a "no slots scheduled" fallback message in that case.
 */
export async function listActiveSlots(): Promise<PublicSlot[]> {
  try {
    const slots = await db
      .select()
      .from(webinarSlots)
      .where(eq(webinarSlots.isActive, true))
      .all();

    if (slots.length === 0) return [];

    const counts = await db
      .select({
        slotId: webinarRegistrations.slotId,
        n: sql<number>`count(*)`,
      })
      .from(webinarRegistrations)
      .where(eq(webinarRegistrations.status, "confirmed"))
      .groupBy(webinarRegistrations.slotId)
      .all();
    const byId = new Map(counts.map((c) => [c.slotId, Number(c.n)]));

    return slots
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((s) => {
        const confirmed = byId.get(s.id) ?? 0;
        const remaining = Math.max(s.maxAttendees - confirmed, 0);
        return {
          id: s.id,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          timezone: s.timezone,
          maxAttendees: s.maxAttendees,
          confirmedCount: confirmed,
          remaining,
          isFull: remaining === 0,
        };
      });
  } catch (err) {
    console.error("[webinar] listActiveSlots failed:", err);
    return [];
  }
}

/** Count current confirmed registrations for a slot. Used at confirm-time to
 *  decide whether a pending registration becomes confirmed or waitlist. */
export async function countConfirmed(slotId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(webinarRegistrations)
    .where(
      and(
        eq(webinarRegistrations.slotId, slotId),
        eq(webinarRegistrations.status, "confirmed")
      )
    )
    .all();
  return Number(rows[0]?.n ?? 0);
}

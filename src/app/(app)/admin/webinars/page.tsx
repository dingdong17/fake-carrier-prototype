import { db } from "@/lib/db";
import { webinarSlots, webinarRegistrations } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { slotDayLabel, slotTimeLabel } from "@/lib/webinar/format";

type SlotRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  maxAttendees: number;
  isActive: boolean;
  confirmed: number;
  pending: number;
  waitlist: number;
};

export default async function AdminWebinarsPage() {
  const slots = await db
    .select()
    .from(webinarSlots)
    .orderBy(webinarSlots.startsAt)
    .all();

  const counts = await db
    .select({
      slotId: webinarRegistrations.slotId,
      status: webinarRegistrations.status,
      n: sql<number>`count(*)`,
    })
    .from(webinarRegistrations)
    .groupBy(webinarRegistrations.slotId, webinarRegistrations.status)
    .all();

  const byId = new Map<string, { confirmed: number; pending: number; waitlist: number }>();
  for (const c of counts) {
    const cur = byId.get(c.slotId) ?? { confirmed: 0, pending: 0, waitlist: 0 };
    const n = Number(c.n);
    if (c.status === "confirmed") cur.confirmed = n;
    else if (c.status === "pending_confirm") cur.pending = n;
    else if (c.status === "waitlist") cur.waitlist = n;
    byId.set(c.slotId, cur);
  }

  const rows: SlotRow[] = slots.map((s) => {
    const c = byId.get(s.id) ?? { confirmed: 0, pending: 0, waitlist: 0 };
    return {
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      maxAttendees: s.maxAttendees,
      isActive: Boolean(s.isActive),
      ...c,
    };
  });

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ec-dark-blue">Webinar-Termine</h1>
        <Link
          href="/admin/webinars/new"
          className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm text-white"
        >
          Neuer Termin
        </Link>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ec-medium-grey text-left text-xs uppercase tracking-wide text-ec-grey-70">
            <th className="py-2">Termin</th>
            <th>Zeit</th>
            <th className="text-right">Kapazität</th>
            <th className="text-right">Bestätigt</th>
            <th className="text-right">Ausstehend</th>
            <th className="text-right">Warteliste</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ec-light-grey">
              <td className="py-2">
                <Link
                  href={`/admin/webinars/${r.id}`}
                  className="text-ec-info hover:underline"
                >
                  {slotDayLabel(r.startsAt)}
                </Link>
              </td>
              <td className="text-xs text-ec-grey-70">
                {slotTimeLabel(r.startsAt, r.endsAt)}
              </td>
              <td className="text-right font-mono">{r.maxAttendees}</td>
              <td className="text-right font-mono">{r.confirmed}</td>
              <td className="text-right font-mono text-ec-grey-70">{r.pending}</td>
              <td className="text-right font-mono text-ec-warning">{r.waitlist}</td>
              <td>
                {r.isActive ? (
                  <span className="rounded bg-ec-success/10 px-2 py-0.5 text-xs text-ec-success">
                    aktiv
                  </span>
                ) : (
                  <span className="rounded bg-ec-grey-40 px-2 py-0.5 text-xs text-ec-grey-70">
                    inaktiv
                  </span>
                )}
              </td>
              <td className="text-right">
                <Link
                  href={`/admin/webinars/${r.id}`}
                  className="text-xs text-ec-info hover:underline"
                >
                  Bearbeiten →
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-6 text-center text-sm text-ec-grey-70">
                Noch keine Termine angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

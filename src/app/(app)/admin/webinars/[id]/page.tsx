import { db } from "@/lib/db";
import { webinarSlots, webinarRegistrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { WebinarSlotForm } from "@/components/admin/webinar-slot-form";
import { RegistrationRow } from "@/components/admin/webinar-registration-row";
import { slotDayLabel, slotTimeLabel } from "@/lib/webinar/format";

export default async function EditWebinarSlotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slot = await db
    .select()
    .from(webinarSlots)
    .where(eq(webinarSlots.id, id))
    .get();
  if (!slot) notFound();

  const regs = await db
    .select()
    .from(webinarRegistrations)
    .where(eq(webinarRegistrations.slotId, id))
    .orderBy(webinarRegistrations.createdAt)
    .all();

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ec-dark-blue">
          {slotDayLabel(slot.startsAt)}
        </h1>
        <p className="text-sm text-ec-grey-70">
          {slotTimeLabel(slot.startsAt, slot.endsAt)} · {slot.maxAttendees}{" "}
          Plätze · {slot.isActive ? "aktiv" : "inaktiv"}
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ec-dark-blue">
          Termin bearbeiten
        </h2>
        <WebinarSlotForm
          mode="edit"
          initial={{
            id: slot.id,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            maxAttendees: slot.maxAttendees,
            isActive: Boolean(slot.isActive),
            notes: slot.notes,
          }}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-ec-dark-blue">
          Anmeldungen ({regs.length})
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ec-medium-grey text-left text-xs uppercase tracking-wide text-ec-grey-70">
              <th className="py-2">Name</th>
              <th>Firma</th>
              <th>E-Mail</th>
              <th>Rolle</th>
              <th>Status</th>
              <th>Angemeldet</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {regs.map((r) => (
              <RegistrationRow
                key={r.id}
                id={r.id}
                name={r.name}
                company={r.company}
                email={r.email}
                role={r.role}
                status={r.status}
                createdAt={r.createdAt}
              />
            ))}
            {regs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-ec-grey-70">
                  Noch keine Anmeldungen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

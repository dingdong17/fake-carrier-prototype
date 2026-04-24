import { db } from "@/lib/db";
import { demoRequests, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DemoRequestActions } from "@/components/admin/demo-request-actions";
import { findClientByEmailDomain, emailDomain } from "@/lib/demo/provision";

export default async function DemoRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db
    .select()
    .from(demoRequests)
    .where(eq(demoRequests.id, id))
    .get();
  if (!row) notFound();

  const domain = emailDomain(row.email);
  const existingClientId = await findClientByEmailDomain(domain);
  const existingClient = existingClientId
    ? await db
        .select()
        .from(clients)
        .where(eq(clients.id, existingClientId))
        .get()
    : null;

  const provisionedClient = row.provisionedClientId
    ? await db
        .select()
        .from(clients)
        .where(eq(clients.id, row.provisionedClientId))
        .get()
    : null;

  return (
    <main className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ec-dark-blue">{row.company}</h1>
        <p className="text-sm text-ec-grey-70">
          Anfrage von {row.name} &lt;{row.email}&gt; · erhalten{" "}
          {new Date(row.createdAt).toLocaleString("de-DE")}
        </p>
      </div>

      <section className="rounded-lg border border-ec-medium-grey bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ec-grey-70">
          Details
        </h2>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
          <dt className="text-ec-grey-70">Firma</dt>
          <dd className="col-span-2">{row.company}</dd>
          <dt className="text-ec-grey-70">Kontakt</dt>
          <dd className="col-span-2">{row.name}</dd>
          <dt className="text-ec-grey-70">E-Mail</dt>
          <dd className="col-span-2 font-mono">{row.email}</dd>
          <dt className="text-ec-grey-70">Telefon</dt>
          <dd className="col-span-2">{row.phone ?? "—"}</dd>
          <dt className="text-ec-grey-70">Flottengröße</dt>
          <dd className="col-span-2">{row.fleetSize}</dd>
          <dt className="text-ec-grey-70">TMS</dt>
          <dd className="col-span-2">{row.tms}</dd>
          <dt className="text-ec-grey-70">Notiz</dt>
          <dd className="col-span-2 whitespace-pre-wrap">{row.note ?? "—"}</dd>
          <dt className="text-ec-grey-70">Consent</dt>
          <dd className="col-span-2 text-xs text-ec-grey-70">
            {new Date(row.consentAt).toLocaleString("de-DE")}
          </dd>
          {row.confirmedAt && (
            <>
              <dt className="text-ec-grey-70">Bestätigt</dt>
              <dd className="col-span-2 text-xs text-ec-grey-70">
                {new Date(row.confirmedAt).toLocaleString("de-DE")}
              </dd>
            </>
          )}
          {row.reviewedAt && (
            <>
              <dt className="text-ec-grey-70">Entschieden</dt>
              <dd className="col-span-2 text-xs text-ec-grey-70">
                {new Date(row.reviewedAt).toLocaleString("de-DE")}
              </dd>
            </>
          )}
          {row.rejectionReason && (
            <>
              <dt className="text-ec-grey-70">Ablehnungsgrund</dt>
              <dd className="col-span-2">{row.rejectionReason}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="rounded-lg border border-ec-medium-grey bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ec-grey-70">
          Tenant-Zuordnung
        </h2>
        {row.status === "approved" && provisionedClient ? (
          <p className="text-sm">
            Freigeschaltet unter Tenant{" "}
            <strong>{provisionedClient.name}</strong> ({provisionedClient.slug}
            ).
          </p>
        ) : existingClient ? (
          <p className="text-sm">
            Bei Freigabe wird der User dem bestehenden Tenant{" "}
            <strong>{existingClient.name}</strong> ({existingClient.slug}){" "}
            hinzugefügt — eine andere E-Mail derselben Domain (<code>{domain}</code>)
            ist bereits registriert.
          </p>
        ) : (
          <p className="text-sm">
            Bei Freigabe wird ein neuer Tenant für <code>{domain}</code>{" "}
            angelegt. Startguthaben: 50 Credits.
          </p>
        )}
      </section>

      <DemoRequestActions id={row.id} status={row.status} />
    </main>
  );
}

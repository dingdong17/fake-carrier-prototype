// src/app/client/[slug]/page.tsx
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { clients, checks } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";

export default async function ClientHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = (await auth())!;
  const client = (await db.select().from(clients).where(eq(clients.slug, slug)).get())!;

  const [{ n: scanCount }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(checks)
    .where(eq(checks.clientId, client.id))
    .all();

  const isClientRole = session.user.role === "client";

  return (
    <div className="space-y-6">
      {isClientRole ? (
        <div className="rounded-xl border border-ec-info/30 bg-ec-info/5 p-4">
          <h2 className="text-sm font-semibold text-ec-dark-blue">So funktioniert&apos;s</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-ec-grey-80 space-y-1">
            <li>Klicken Sie auf <strong>Neue Prüfung</strong>.</li>
            <li>Laden Sie Versicherungsnachweis, EU-Lizenz und weitere Unterlagen hoch.</li>
            <li>Die KI erkennt Dokumenttypen, extrahiert Daten und prüft auf Risikosignale.</li>
            <li>Jede Prüfung verbraucht Credits (Quick 1 · Medium 2 · Full 5).</li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-ec-grey-70">
          Sie sehen diesen Kunden als <strong>{session.user.role}</strong>. Scans,
          die Sie von hier starten, werden ohne Credit-Verbrauch abgerechnet —
          nur Scans durch Kunden-Benutzer selbst verbrauchen Guthaben.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href={`/client/${slug}/check`}
          className="rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm hover:border-ec-dark-blue"
        >
          <h2 className="text-lg font-semibold text-ec-dark-blue">Neue Prüfung</h2>
          <p className="mt-1 text-sm text-ec-grey-70">Starten Sie einen neuen Scan.</p>
        </Link>
        <Link
          href={`/client/${slug}/history`}
          className="rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm hover:border-ec-dark-blue"
        >
          <h2 className="text-lg font-semibold text-ec-dark-blue">Verlauf ({scanCount})</h2>
          <p className="mt-1 text-sm text-ec-grey-70">Alle bisherigen Prüfungen.</p>
        </Link>
        <div className="rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ec-dark-blue">Guthaben</h2>
          <p className="mt-1 text-3xl font-bold text-ec-dark-blue">{client.creditBalance}</p>
          <p className="text-xs text-ec-grey-70">Credits verfügbar</p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { RecentChecks } from "@/components/check/recent-checks";

export const dynamic = "force-dynamic";

const recBadge: Record<
  string,
  { variant: "success" | "warning" | "high" | "critical"; label: string }
> = {
  approve: { variant: "success", label: "Freigeben" },
  review: { variant: "warning", label: "Prüfen" },
  warning: { variant: "high", label: "Warnung" },
  reject: { variant: "critical", label: "Ablehnen" },
};

export default function HomePage() {
  const totalChecks = db
    .select({ count: sql<number>`count(*)` })
    .from(checks)
    .get();
  const recentChecks = db
    .select()
    .from(checks)
    .orderBy(desc(checks.createdAt))
    .limit(5)
    .all();

  const total = totalChecks?.count ?? 0;
  const rejected = recentChecks.filter(
    (c) => c.recommendation === "reject"
  ).length;
  const approved = recentChecks.filter(
    (c) => c.recommendation === "approve"
  ).length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-ec-dark-blue px-8 py-12 text-center">
        <h1 className="font-barlow text-4xl font-semibold text-white">
          Frachtführer-Prüfung
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ec-mint">
          KI-gestützte Dokumentenprüfung zur Erkennung betrügerischer
          Frachtführer. Laden Sie Dokumente hoch und erhalten Sie eine
          sofortige Risikoanalyse.
        </p>
        <Link
          href="/check"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-ec-mint px-6 py-3 text-lg font-medium text-ec-dark-blue transition-colors hover:bg-ec-light-green"
        >
          Neue Prüfung starten
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-3xl font-semibold text-ec-dark-blue">{total}</p>
          <p className="mt-1 text-sm text-ec-grey-80">Prüfungen gesamt</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-semibold text-ec-error">{rejected}</p>
          <p className="mt-1 text-sm text-ec-grey-80">
            Abgelehnt (letzte 5)
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-semibold text-ec-success">{approved}</p>
          <p className="mt-1 text-sm text-ec-grey-80">
            Freigegeben (letzte 5)
          </p>
        </Card>
      </div>

      {/* Recent checks */}
      <Card>
        <h2 className="font-barlow text-xl font-semibold text-ec-dark-blue">
          Letzte Prüfungen
        </h2>

        <RecentChecks initialChecks={recentChecks} />

        <div className="mt-4">
          <Link
            href="/history"
            className="text-sm font-medium text-ec-dark-blue hover:text-ec-light-blue"
          >
            Alle Prüfungen anzeigen &rarr;
          </Link>
        </div>
      </Card>
    </div>
  );
}

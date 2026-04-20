import Link from "next/link";
import { db } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default async function HistoryPage() {
  const allChecks = await db
    .select()
    .from(checks)
    .orderBy(desc(checks.createdAt))
    .all();

  return (
    <div className="space-y-6">
      <h1 className="font-barlow text-3xl font-semibold text-ec-dark-blue">
        Prüfverlauf
      </h1>

      {allChecks.length === 0 ? (
        <Card>
          <p className="text-ec-grey-80">
            Noch keine Prüfungen durchgeführt.
          </p>
          <Link
            href="/check"
            className="mt-3 inline-block text-sm font-medium text-ec-dark-blue hover:text-ec-light-blue"
          >
            Erste Prüfung starten &rarr;
          </Link>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ec-medium-grey text-xs uppercase tracking-wide text-ec-grey-80">
                <th className="pb-3 pr-4">Nr.</th>
                <th className="pb-3 pr-4">Frachtführer</th>
                <th className="pb-3 pr-4">Datum</th>
                <th className="pb-3 pr-4">Risiko</th>
                <th className="pb-3 pr-4">Vertrauen</th>
                <th className="pb-3">Empfehlung</th>
              </tr>
            </thead>
            <tbody>
              {allChecks.map((check) => {
                const badge = check.recommendation
                  ? recBadge[check.recommendation]
                  : null;
                return (
                  <tr
                    key={check.id}
                    className="border-b border-ec-medium-grey last:border-0 transition-colors hover:bg-ec-light-grey/50"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/results/${check.id}`}
                        className="font-medium text-ec-dark-blue hover:text-ec-light-blue"
                      >
                        {check.checkNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-ec-dark-blue">
                      {check.carrierName}
                    </td>
                    <td className="py-3 pr-4 text-ec-grey-80">
                      {new Date(check.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="py-3 pr-4 text-ec-dark-blue">
                      {check.riskScore != null
                        ? `${Math.round(check.riskScore)}%`
                        : "–"}
                    </td>
                    <td className="py-3 pr-4 text-ec-dark-blue">
                      {check.confidenceLevel != null
                        ? `${Math.round(check.confidenceLevel)}%`
                        : "–"}
                    </td>
                    <td className="py-3">
                      {badge ? (
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      ) : (
                        <span className="text-ec-grey-80">–</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

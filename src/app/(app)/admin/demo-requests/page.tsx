import { db } from "@/lib/db";
import { demoRequests } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  pending_confirm: "Ausstehend",
  confirmed: "Zu prüfen",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};

const STATUS_CLASS: Record<string, string> = {
  pending_confirm: "bg-ec-grey-40 text-ec-grey-80",
  confirmed: "bg-ec-info/10 text-ec-info",
  approved: "bg-ec-success/10 text-ec-success",
  rejected: "bg-ec-error/10 text-ec-error",
};

export default async function AdminDemoRequestsPage() {
  const rows = await db
    .select()
    .from(demoRequests)
    .orderBy(desc(demoRequests.createdAt))
    .all();

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">Demo-Anfragen</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ec-medium-grey text-left text-xs uppercase tracking-wide text-ec-grey-70">
            <th className="py-2">Firma</th>
            <th>Kontakt</th>
            <th>E-Mail</th>
            <th>Flotte / TMS</th>
            <th>Status</th>
            <th>Erhalten</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ec-light-grey">
              <td className="py-2 font-medium">{r.company}</td>
              <td>{r.name}</td>
              <td className="text-ec-grey-70">{r.email}</td>
              <td className="text-xs text-ec-grey-70">
                {r.fleetSize} · {r.tms}
              </td>
              <td>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    STATUS_CLASS[r.status] ?? ""
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </td>
              <td className="text-xs text-ec-grey-70">
                {new Date(r.createdAt).toLocaleDateString("de-DE")}
              </td>
              <td className="text-right">
                <Link
                  href={`/admin/demo-requests/${r.id}`}
                  className="text-xs text-ec-info hover:underline"
                >
                  Prüfen →
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-sm text-ec-grey-70">
                Noch keine Demo-Anfragen.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

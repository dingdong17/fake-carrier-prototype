// src/app/admin/page.tsx
import { db } from "@/lib/db";
import { users, clients, checks } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";

export default async function AdminHome() {
  const [userCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(users)
    .all();
  const [clientCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(clients)
    .all();
  const [checkCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(checks)
    .all();
  const [creditsTotal] = await db
    .select({ n: sql<number>`coalesce(sum(credit_balance), 0)` })
    .from(clients)
    .all();

  const stats = [
    { label: "Benutzer", value: userCount.n, href: "/admin/users" },
    { label: "Kunden", value: clientCount.n, href: "/admin/clients" },
    { label: "Prüfungen gesamt", value: checkCount.n, href: null },
    { label: "Credits im Umlauf", value: creditsTotal.n, href: null },
  ];

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">Admin-Übersicht</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const content = (
            <div className="rounded-xl border border-ec-medium-grey bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-ec-grey-70">
                {s.label}
              </p>
              <p className="mt-1 text-3xl font-bold text-ec-dark-blue">{s.value}</p>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="hover:opacity-90">
              {content}
            </Link>
          ) : (
            <div key={s.label}>{content}</div>
          );
        })}
      </div>
      <p className="text-xs text-ec-grey-70">
        Weitere Verwaltung: <Link href="/admin/clients" className="text-ec-info underline">Kunden</Link>,{" "}
        <Link href="/admin/users" className="text-ec-info underline">Benutzer</Link>.
      </p>
    </main>
  );
}

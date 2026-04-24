// src/app/admin/clients/page.tsx
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function ClientsListPage() {
  const rows = await db
    .select()
    .from(clients)
    .orderBy(desc(clients.createdAt))
    .all();

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ec-dark-blue">Kunden</h1>
        <Link
          href="/admin/clients/new"
          className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm text-white"
        >
          Neuer Kunde
        </Link>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-ec-medium-grey text-left text-xs uppercase tracking-wide text-ec-grey-70">
            <th className="py-2">Name</th>
            <th>Slug</th>
            <th className="text-right">Guthaben</th>
            <th>Erstellt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-ec-light-grey">
              <td className="py-2">
                <Link href={`/admin/clients/${c.slug}`} className="text-ec-info hover:underline">
                  {c.name}
                </Link>
              </td>
              <td>{c.slug}</td>
              <td className="text-right font-mono">{c.creditBalance}</td>
              <td className="text-xs text-ec-grey-70">
                {new Date(c.createdAt).toLocaleDateString("de-DE")}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-sm text-ec-grey-70">
                Noch keine Kunden angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

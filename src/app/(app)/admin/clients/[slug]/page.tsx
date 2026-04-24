// src/app/admin/clients/[slug]/page.tsx
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CreditBalanceCard } from "@/components/admin/credit-balance-card";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await db.select().from(clients).where(eq(clients.slug, slug)).get();
  if (!client) notFound();

  const clientUsers = await db
    .select()
    .from(users)
    .where(eq(users.clientId, client.id))
    .all();

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ec-dark-blue">{client.name}</h1>
          <p className="text-sm text-ec-grey-70 font-mono">/client/{client.slug}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CreditBalanceCard slug={client.slug} initial={client.creditBalance} />
        <div className="rounded-xl border border-ec-medium-grey bg-white p-4">
          <p className="text-xs uppercase text-ec-grey-70">Benutzer</p>
          <p className="mt-1 text-3xl font-bold text-ec-dark-blue">{clientUsers.length}</p>
          <Link
            href={`/admin/clients/${slug}/users/new`}
            className="mt-2 block text-sm text-ec-info hover:underline"
          >
            Benutzer hinzufügen
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase text-ec-grey-70">
          Benutzer dieses Kunden
        </h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-ec-grey-70">
              <th>Name</th>
              <th>E-Mail</th>
              <th>Angelegt</th>
            </tr>
          </thead>
          <tbody>
            {clientUsers.map((u) => (
              <tr key={u.id} className="border-b border-ec-light-grey">
                <td className="py-2">{u.name ?? "—"}</td>
                <td>{u.email}</td>
                <td className="text-xs text-ec-grey-70">
                  {new Date(u.createdAt).toLocaleDateString("de-DE")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

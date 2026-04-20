// src/app/admin/users/page.tsx
import { db } from "@/lib/db";
import { users, clients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export default async function UsersListPage() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      clientName: clients.name,
      clientSlug: clients.slug,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(clients, eq(users.clientId, clients.id))
    .orderBy(desc(users.createdAt))
    .all();

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ec-dark-blue">Benutzer</h1>
        <Link
          href="/admin/users/new"
          className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm text-white"
        >
          Admin / Broker hinzufügen
        </Link>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-ec-medium-grey text-left text-xs uppercase text-ec-grey-70">
            <th>E-Mail</th><th>Name</th><th>Rolle</th><th>Kunde</th><th>Angelegt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-ec-light-grey">
              <td className="py-2">{u.email}</td>
              <td>{u.name}</td>
              <td className="font-mono text-xs">{u.role}</td>
              <td>
                {u.clientSlug ? (
                  <Link href={`/admin/clients/${u.clientSlug}`} className="text-ec-info hover:underline">
                    {u.clientName}
                  </Link>
                ) : "—"}
              </td>
              <td className="text-xs text-ec-grey-70">
                {new Date(u.createdAt).toLocaleDateString("de-DE")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

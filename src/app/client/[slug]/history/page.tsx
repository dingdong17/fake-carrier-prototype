import { auth } from "@/lib/auth/config";
import { assertClientScope } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { checks, clients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertClientScope(session.user, slug);

  const client = await db
    .select()
    .from(clients)
    .where(eq(clients.slug, slug))
    .get();
  if (!client) notFound();

  const rows = await db
    .select()
    .from(checks)
    .where(eq(checks.clientId, client.id))
    .orderBy(desc(checks.createdAt))
    .all();

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">
        Verlauf — {client.name}
      </h1>
      {rows.length === 0 ? (
        <p className="text-sm text-ec-grey-70">Noch keine Prüfungen.</p>
      ) : (
        <ul className="divide-y divide-ec-medium-grey">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/client/${slug}/results/${c.id}`}
                className="flex items-center justify-between py-3 hover:bg-ec-light-grey"
              >
                <span>
                  <strong>{c.checkNumber}</strong> — {c.carrierName}
                </span>
                <span className="text-xs text-ec-grey-70">
                  {new Date(c.createdAt).toLocaleDateString("de-DE")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

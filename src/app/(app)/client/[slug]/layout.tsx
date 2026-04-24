// src/app/client/[slug]/layout.tsx
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { assertClientScope } from "@/lib/auth/session";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function ClientScopeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertClientScope(session.user, slug);

  const client = await db.select().from(clients).where(eq(clients.slug, slug)).get();
  if (!client) notFound();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-ec-medium-grey bg-white px-6 py-3">
        <div>
          <Link href={`/client/${slug}`} className="font-bold text-ec-dark-blue">
            FakeCarrier.AI
          </Link>
          <span className="ml-3 text-sm text-ec-grey-70">{client.name}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-ec-grey-70">
          <span>Credits: <strong className="text-ec-dark-blue">{client.creditBalance}</strong></span>
          <span>{session.user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

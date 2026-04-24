import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <aside className="border-r border-ec-medium-grey bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-ec-grey-70">
          Administration
        </h2>
        <nav className="space-y-1 text-sm">
          <Link href="/admin" className="block rounded px-2 py-1 hover:bg-ec-light-grey">
            Übersicht
          </Link>
          <Link href="/admin/clients" className="block rounded px-2 py-1 hover:bg-ec-light-grey">
            Kunden
          </Link>
          <Link href="/admin/users" className="block rounded px-2 py-1 hover:bg-ec-light-grey">
            Benutzer
          </Link>
          <Link href="/admin/webinars" className="block rounded px-2 py-1 hover:bg-ec-light-grey">
            Webinare
          </Link>
          <Link href="/admin/demo-requests" className="block rounded px-2 py-1 hover:bg-ec-light-grey">
            Demo-Anfragen
          </Link>
          <Link href="/backlog" className="block rounded px-2 py-1 hover:bg-ec-light-grey">
            Backlog
          </Link>
          <Link href="/feedback" className="block rounded px-2 py-1 hover:bg-ec-light-grey">
            Feedback
          </Link>
        </nav>
        <div className="mt-8 text-xs text-ec-grey-70">
          Angemeldet: {session.user.email}
          <div className="mt-2">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <div className="p-6">{children}</div>
    </div>
  );
}

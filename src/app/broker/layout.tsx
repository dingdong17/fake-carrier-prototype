import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function BrokerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "broker" && session.user.role !== "admin") {
    redirect("/");
  }
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-ec-medium-grey bg-white px-6 py-3">
        <Link href="/broker" className="font-bold text-ec-dark-blue">
          FakeCarrier.AI — Broker
        </Link>
        <span className="text-xs text-ec-grey-70">
          {session.user.email} · <LogoutButton />
        </span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

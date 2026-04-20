import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === "admin") redirect("/admin");
    if (session.user.role === "broker") redirect("/broker");
    if (session.user.role === "client" && session.user.clientSlug) {
      redirect(`/client/${session.user.clientSlug}`);
    }
  }
  // Anonymous: placeholder landing — BL-049 replaces this with the real port.
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="mb-4 text-4xl font-bold text-ec-dark-blue">
        FakeCarrier.AI
      </h1>
      <p className="mb-8 text-ec-grey-80">
        KI-gestützte Frachtführer-Verifikation für die deutsche Logistik.
      </p>
      <Link
        href="/login"
        className="inline-block rounded-lg bg-ec-dark-blue px-6 py-3 text-sm font-medium text-white"
      >
        Jetzt einloggen
      </Link>
    </main>
  );
}

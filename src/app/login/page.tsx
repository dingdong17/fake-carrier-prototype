import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === "admin") redirect("/admin");
    if (session.user.role === "broker") redirect("/broker");
    if (session.user.role === "client" && session.user.clientSlug) {
      redirect(`/client/${session.user.clientSlug}`);
    }
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-ec-dark-blue">
        FakeCarrier.AI — Login
      </h1>
      <p className="mb-6 text-sm text-ec-grey-70">
        Geben Sie Ihre geschäftliche E-Mail ein. Wir senden Ihnen einen
        einmaligen Login-Link. Zugang wird vom Administrator freigeschaltet —
        falls Sie noch keinen haben, kontaktieren Sie Ihren Broker.
      </p>
      <LoginForm />
    </main>
  );
}

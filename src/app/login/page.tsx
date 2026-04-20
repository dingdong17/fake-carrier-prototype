import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Verification:
    "Ihr Login-Link ist nicht mehr gültig (bereits verwendet oder abgelaufen). Bitte fordern Sie einen neuen an.",
  AccessDenied:
    "Zugang verweigert. Für Ihre E-Mail-Adresse wurde kein Konto freigeschaltet.",
  Configuration:
    "Auth-Konfigurationsfehler. Bitte kontaktieren Sie den Administrator.",
  Default: "Beim Anmelden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === "admin") redirect("/admin");
    if (session.user.role === "broker") redirect("/broker");
    if (session.user.role === "client" && session.user.clientSlug) {
      redirect(`/client/${session.user.clientSlug}`);
    }
    redirect("/");
  }

  const { error } = await searchParams;
  const errorMessage = error
    ? (AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.Default)
    : null;

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
      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
          <span className="ml-1 font-mono text-xs text-red-600">[{error}]</span>
        </div>
      )}
      <LoginForm />
    </main>
  );
}

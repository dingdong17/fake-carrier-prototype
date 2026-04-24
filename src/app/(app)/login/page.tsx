import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { MicrosoftSignInButton } from "@/components/auth/microsoft-signin-button";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Verification:
    "Ihr Login-Link ist nicht mehr gültig (bereits verwendet oder abgelaufen). Bitte fordern Sie einen neuen an.",
  AccessDenied:
    "Zugang verweigert. Für Ihre E-Mail-Adresse wurde kein Konto freigeschaltet oder Ihre Organisation ist nicht zugelassen.",
  Configuration:
    "Auth-Konfigurationsfehler. Bitte kontaktieren Sie den Administrator.",
  OAuthSignin:
    "Microsoft-Anmeldung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.",
  OAuthCallback:
    "Microsoft-Anmeldung wurde abgebrochen oder ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
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
        Covermesh-, Ecclesia- und SCHUNCK-Mitarbeitende melden sich mit
        Microsoft an. Externe Nutzer:innen erhalten einen einmaligen
        Login-Link per E-Mail. Zugang wird vom Administrator freigeschaltet.
      </p>
      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
          <span className="ml-1 font-mono text-xs text-red-600">[{error}]</span>
        </div>
      )}

      <div className="mb-6">
        <MicrosoftSignInButton callbackUrl="/" />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-ec-grey-70">
        <span className="h-px flex-1 bg-ec-medium-grey" />
        <span>oder mit E-Mail-Link</span>
        <span className="h-px flex-1 bg-ec-medium-grey" />
      </div>

      <LoginForm />
    </main>
  );
}

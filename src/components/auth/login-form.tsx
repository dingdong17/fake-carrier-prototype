"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { isTrustedDomain } from "@/lib/auth/trusted-domains";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);

        // Client-side gate: trusted-domain emails must use Microsoft SSO.
        // Server-side backstop is in authConfig.callbacks.signIn, which
        // catches anyone who bypasses this form (direct POST to Auth.js).
        if (isTrustedDomain(email)) {
          setError(
            "Ihre E-Mail-Adresse erfordert eine Microsoft-Anmeldung. Bitte nutzen Sie den Microsoft-Button oben."
          );
          return;
        }

        startTransition(async () => {
          const res = await signIn("email", {
            email,
            redirect: false,
            callbackUrl: "/",
          });
          if (res?.error) {
            setError("E-Mail-Versand fehlgeschlagen. Versuchen Sie es erneut.");
            return;
          }
          window.location.href = "/login/check-email";
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-ec-grey-80">E-Mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
          placeholder="name@firma.de"
          autoComplete="email"
          autoFocus
        />
      </label>
      {error && <p className="text-sm text-ec-error">{error}</p>}
      <Button type="submit" size="lg" disabled={pending || !email}>
        {pending ? "Wird gesendet..." : "Login-Link senden"}
      </Button>
    </form>
  );
}

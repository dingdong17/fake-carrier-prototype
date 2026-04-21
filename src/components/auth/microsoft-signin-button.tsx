// src/components/auth/microsoft-signin-button.tsx
"use client";

import { signIn } from "next-auth/react";

export function MicrosoftSignInButton({
  callbackUrl = "/",
}: {
  callbackUrl?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-ec-medium-grey bg-white px-4 py-3 text-sm font-semibold text-ec-dark-blue shadow-sm hover:bg-ec-grey-05"
    >
      <MicrosoftIcon />
      Mit Microsoft anmelden
    </button>
  );
}

function MicrosoftIcon() {
  return (
    <svg
      viewBox="0 0 21 21"
      className="h-5 w-5"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

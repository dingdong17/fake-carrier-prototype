"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-ec-grey-70 hover:text-ec-error"
    >
      Abmelden
    </button>
  );
}

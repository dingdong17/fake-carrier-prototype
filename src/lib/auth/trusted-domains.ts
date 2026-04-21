// src/lib/auth/trusted-domains.ts
//
// Kept separate from entra-tenants.ts because this is imported by client
// components; entra-tenants.ts reads server-only env vars (tenant GUIDs).
// Updating this list and entra-tenants.ts together when onboarding a new
// tenant is a deliberate two-step — the PR reviewer catches drift.

export const TRUSTED_DOMAINS = ["covermesh.com"] as const;

export function isTrustedDomain(email: string): boolean {
  const at = email.indexOf("@");
  if (at < 0 || at === email.length - 1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return (TRUSTED_DOMAINS as readonly string[]).includes(domain);
}

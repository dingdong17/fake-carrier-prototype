// src/lib/auth/entra-tenants.ts
//
// Tenant allowlist for Microsoft Entra SSO.
// Adding a new tenant (Ecclesia, SCHUNCK, …):
//   1. Add a new env var (e.g. ENTRA_ECCLESIA_TENANT_ID)
//   2. Add a new entry in TENANT_ALLOWLIST() below
//   3. Have the tenant admin consent via the admin-consent URL (see docs/auth-entra-setup.md)

export type TenantConfig = {
  emailDomain: string;
  displayName: string;
};

export type EntraValidation =
  | { ok: true }
  | { ok: false; reason: "unknown_tenant" | "domain_mismatch" };

/**
 * TENANT_ALLOWLIST is a function (not a const) so it reads env vars at
 * call time. This matters for tests that set env vars per-case, and
 * avoids module-init-time coupling to env var loading order.
 */
export function TENANT_ALLOWLIST(): Record<string, TenantConfig> {
  const map: Record<string, TenantConfig> = {};
  const covermeshTid = process.env.ENTRA_COVERMESH_TENANT_ID;
  if (covermeshTid) {
    map[covermeshTid] = {
      emailDomain: "covermesh.com",
      displayName: "covermesh",
    };
  }
  // Future: Ecclesia, SCHUNCK — add ENTRA_ECCLESIA_TENANT_ID / _SCHUNCK_ env vars
  // and a block here. No other file needs to change.
  return map;
}

function domainOf(email: string): string | null {
  const at = email.indexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

export function isTrustedDomain(email: string): boolean {
  const domain = domainOf(email);
  if (!domain) return false;
  const map = TENANT_ALLOWLIST();
  return Object.values(map).some((t) => t.emailDomain === domain);
}

export function tenantForEmail(email: string): TenantConfig | null {
  const domain = domainOf(email);
  if (!domain) return null;
  const map = TENANT_ALLOWLIST();
  return Object.values(map).find((t) => t.emailDomain === domain) ?? null;
}

export function validateEntraSignIn(input: {
  tid: string;
  email: string;
}): EntraValidation {
  const { tid, email } = input;
  const map = TENANT_ALLOWLIST();
  const entry = tid ? map[tid] : undefined;
  if (!entry) return { ok: false, reason: "unknown_tenant" };
  const domain = domainOf(email);
  if (!domain || domain !== entry.emailDomain) {
    return { ok: false, reason: "domain_mismatch" };
  }
  return { ok: true };
}

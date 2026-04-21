# Microsoft Entra SSO — Design

**Status:** Draft · **Date:** 2026-04-21 · **Author:** Don (with Claude)

## Purpose

Add Microsoft Entra (Azure AD) single sign-on to FakeCarrier so covermesh
staff — and later Ecclesia and SCHUNCK staff — sign in with their
corporate Microsoft identity instead of email magic-link. External client
users (e.g. logistics ops at Muster Logistik) continue to use magic-link.

This supersedes the Entra portion of BL-009 (which was closed against
the email-magic-link + RBAC implementation on 2026-04-20). A new backlog
item will be filed for this work.

## Scope

**In scope**

- Single `MicrosoftEntraId` provider using the multi-tenant
  `/organizations/v2.0` issuer.
- Tenant allowlist with typed map: `{ tid → { emailDomain, displayName } }`.
  Initial entry: covermesh's tenant only.
- First-login auto-provisioning: `role = "broker"` for any user signing
  in via Entra. No client-role ever provisioned via Entra.
- Account linking for existing users (e.g. Don the admin) by verified
  email, preserving their existing role.
- Magic-link form rejects trusted-domain emails with a German banner
  pointing users to the Microsoft button.
- Admin promotion via a new one-shot script `scripts/promote-to-admin.ts`.
- Azure app registration docs in `docs/auth-entra-setup.md`.

**Out of scope**

- Entra user bulk-sync (covermesh-PPP has one; we don't need it at this
  scale).
- Admin UI for managing users or tenants (BL-051 covers the user UI).
- Ecclesia and SCHUNCK onboarding — adding them is a 3-line PR once
  their tenant admins consent; not done in this slice.
- Microsoft Graph integration (group-based roles, profile sync, etc.).

## Architecture

**Provider config** — `src/lib/auth/config.ts`:

- One new entry in `authConfig.providers[]`:
  ```ts
  MicrosoftEntraId({
    clientId: process.env.AZURE_AD_CLIENT_ID!,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
    issuer: "https://login.microsoftonline.com/organizations/v2.0",
    allowDangerousEmailAccountLinking: true,
  })
  ```
- No `AZURE_AD_TENANT_ID` — the tenant allowlist is enforced in code,
  not pinned in the issuer URL. `/organizations/v2.0` accepts any workplace
  directory; our `signIn` callback rejects disallowed ones.
- `allowDangerousEmailAccountLinking: true` is safe here because (a) Entra
  verifies emails and (b) the tenant + domain allowlist already gates
  who can use this provider.

**Tenant allowlist** — new file `src/lib/auth/entra-tenants.ts`:

```ts
export type TenantConfig = { emailDomain: string; displayName: string };

// Tenant GUID → config. Add new tenants here; no env var involved.
export const TENANT_ALLOWLIST: Record<string, TenantConfig> = {
  [process.env.ENTRA_COVERMESH_TENANT_ID!]: {
    emailDomain: "covermesh.com",
    displayName: "covermesh",
  },
  // Ecclesia and SCHUNCK will be added here when their tenants are onboarded.
};

export function isTrustedDomain(email: string): boolean;
export function tenantForEmail(email: string): TenantConfig | null;
export function validateEntraSignIn(input: {
  tid: string;
  email: string;
}): { ok: true } | { ok: false; reason: "unknown_tenant" | "domain_mismatch" };
```

**Note on the tenant GUID:** we keep the *GUID* as an env var
(`ENTRA_COVERMESH_TENANT_ID`) even though the allowlist map is in code —
the GUID isn't a secret, but coupling it to the deployment environment
lets us use different Entra registrations for preview vs prod without a
code change. The *mapping* (GUID → domain) is in code.

**`signIn` callback** — in `authConfig.callbacks.signIn`:

- When `account.provider === "microsoft-entra-id"`, read the `tid` claim
  (from `profile.tid`, falling back to decoding `account.id_token` if
  the profile shape doesn't expose it — depends on `@auth/core` version)
  and `user.email`. Call `validateEntraSignIn({ tid, email })`. If not
  `ok`, log the reason server-side and return `false` (NextAuth surfaces
  `/login?error=AccessDenied`). Never leak which part failed — avoids
  tenant enumeration.
- For other providers (email), existing behavior.

**Role provisioning on first Entra sign-in — the tricky bit.** The
Drizzle adapter's default `createUser` inserts into `users` without a
`role` column value; our schema has `role NOT NULL` with no default, so
that insert fails today. We have three options; the plan phase picks
one:

1. **Custom `adapter.createUser` override** — wrap `DrizzleAdapter`'s
   `createUser` and inject `role: "broker"` when the insert originates
   from an Entra sign-in. Cleanest: a single DB round-trip, no
   tombstone state. Requires detecting the provider at adapter time
   (feasible by stashing it in a request-scoped store from the
   `signIn` callback, or by making the default unconditional — see
   option 3).
2. **`events.signIn` with `isNewUser`** — let the adapter insert fail,
   OR relax the schema to allow NULL role, then patch the role after
   creation. Requires a schema migration (`role` nullable OR default),
   and leaves a brief window where a user exists without a role.
3. **Schema default `role = 'broker'`** — migration making
   `role DEFAULT 'broker'`. Simplest. Risk: any future code path that
   creates a user (e.g. a sloppy magic-link auto-provision) would
   silently get broker. Mitigated because we don't auto-provision for
   magic-link today (the form gates on pre-existing users) and the
   allowlist already restricts Entra.

Preference (to be finalized in the plan): option 1 — override
`createUser` in the adapter spread. Keeps the schema honest and
restricts default-role assignment to the Entra path explicitly.

**`signIn` event** — in `authConfig.events.signIn`:

- If `isNewUser === true` and `account?.provider === "microsoft-entra-id"`,
  ensure `role` is set to `"broker"` (idempotent; redundant with the
  adapter override above but acts as a defensive fallback if option 3
  is chosen).
- Existing users are untouched.

**Magic-link gate** — modify `src/lib/auth/send-magic-link.ts`:

- At the top of `sendMagicLink`, check `isTrustedDomain(email)`. If
  true, `throw new Error("AccessDenied: trusted domain must use SSO")`.
  NextAuth maps thrown errors on sendVerificationRequest to
  `?error=AccessDenied`. This is the backstop; the primary gate is in
  the form.

**Magic-link form gate** — modify `src/components/auth/login-form.tsx`
(and whatever server action / route handler it calls):

- Before invoking `signIn("email", ...)`, call `isTrustedDomain(email)`.
  If true, return `{ error: "TrustedDomainMustUseSSO" }` which is
  rendered inline by the form. No request is made to NextAuth.

**No schema changes.** The Auth.js `accounts` table already stores
`provider='microsoft-entra-id'` + `providerAccountId=<entra oid>`. The
`users` table already has `role` and `clientId`.

## Components and files

**New**

- `src/lib/auth/entra-tenants.ts` — allowlist, helpers, `validateEntraSignIn`.
- `src/lib/auth/entra-tenants.test.ts` — unit tests (see Testing).
- `src/components/auth/microsoft-signin-button.tsx` — client component
  rendering the Microsoft-branded button and calling
  `signIn("microsoft-entra-id", { callbackUrl: "/" })`. Follow the
  Ecclesia brand (not covermesh-PPP's cm-blue). 4-square MS logo SVG
  inline.
- `scripts/promote-to-admin.ts` — one-shot CLI: takes an email, sets
  `role='admin'`. Pattern lifted from `scripts/fix-admin-name.ts`.
- `docs/auth-entra-setup.md` — Azure app registration steps (see below).

**Modified**

- `src/lib/auth/config.ts` — add Entra provider, extend `signIn` callback,
  add `events.createUser`.
- `src/lib/auth/send-magic-link.ts` — trusted-domain precheck.
- `src/app/login/page.tsx` — render the Microsoft button above the
  magic-link form with a visual divider ("oder mit E-Mail-Link"). Add
  `TrustedDomainMustUseSSO` to `AUTH_ERROR_MESSAGES`. Fill in German
  strings for `OAuthCallback` and `OAuthSignin` (currently fall through
  to Default).
- `src/components/auth/login-form.tsx` — trusted-domain gate before
  `signIn("email", ...)`.
- `.env.example` — add `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`,
  `ENTRA_COVERMESH_TENANT_ID`.

## Data flows

**A. New covermesh user, first SSO sign-in**

1. `/login` → Microsoft button → `/api/auth/callback/microsoft-entra-id`.
2. `signIn` callback: `validateEntraSignIn` ok → return true.
3. Drizzle adapter inserts `users` row (no role yet) and `accounts` row.
4. `events.createUser` fires → `UPDATE users SET role = 'broker'`.
5. Session callback attaches `role`, `clientId`, `clientSlug`.
6. Proxy redirects to `/broker`.

**B. Existing admin (Don), first SSO sign-in**

1. Same 1–2 as A.
2. Adapter looks up user by email → finds Don. Link new `accounts` row.
   **No user update.** Role stays `admin`.
3. `events.createUser` does NOT fire.
4. Proxy redirects to `/admin`.

**C. External client user (magic-link path)**

- `ops@muster-logistik.de` → `isTrustedDomain` false → magic-link sent
  → existing flow.

**D. Covermesh user tries magic-link**

1. `someone@covermesh.com` in magic-link form → server action calls
   `isTrustedDomain` → true → returns `{ error: "TrustedDomainMustUseSSO" }`.
2. Inline banner: "Ihre E-Mail-Adresse erfordert eine Microsoft-
   Anmeldung. Bitte nutzen Sie den Microsoft-Button oben."
3. Backstop: if the form is bypassed, `sendMagicLink` precheck throws
   → `/login?error=AccessDenied`.

**E. Disallowed tenant (e.g. personal Microsoft account)**

- Steps 1 as A → `signIn` returns false → `/login?error=AccessDenied`.

## Error handling

**New error code on `/login`:**

- `TrustedDomainMustUseSSO` → "Ihre E-Mail-Adresse erfordert eine
  Microsoft-Anmeldung. Bitte nutzen Sie den Microsoft-Button oben."

**Codes to add German copy for:**

- `OAuthCallback` → "Microsoft-Anmeldung wurde abgebrochen oder ist
  fehlgeschlagen. Bitte versuchen Sie es erneut."
- `OAuthSignin` → "Microsoft-Anmeldung konnte nicht gestartet werden.
  Bitte versuchen Sie es erneut."

**Reused codes:**

- `AccessDenied` — already present. Triggered by: tenant not in
  allowlist, domain mismatch, or `sendMagicLink` precheck. Existing
  copy fine.
- `Configuration` — env vars missing. Existing copy fine.

**Server-side logging:** `signIn` callback logs rejection reason
(`[entra] reject: tid=X domain=Y reason=unknown_tenant`) but the client
never sees the specific reason.

## Azure app registration (operational)

Captured in `docs/auth-entra-setup.md`. Key requirements:

- "Supported account types" = "Accounts in any organizational
  directory" (multi-tenant).
- Redirect URIs:
  - `https://fakecarrier.rorlach.de/api/auth/callback/microsoft-entra-id`
  - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (dev)
- Scopes requested: `openid profile email`.
- Covermesh tenant admin consents once via the admin-consent URL.
- Client secret generated in covermesh's Entra; rotated annually.

## Testing

**Unit tests** (Vitest, matches `src/lib/auth/session.test.ts` pattern):

- `entra-tenants.test.ts`:
  - `tenantForEmail` — case-insensitive match, returns config for
    covermesh.com, null for gmail.com.
  - `isTrustedDomain` — true for covermesh.com, false for gmail.com.
  - `validateEntraSignIn` — ok for matched tid+domain, `unknown_tenant`
    for unknown tid, `domain_mismatch` for known tid + wrong domain.
- `send-magic-link.test.ts` — extend: trusted domain throws with
  `AccessDenied` in the message; non-trusted domain runs the normal
  path.

**TDD:** tests first, red, then implement.

**No integration test** for the Microsoft round-trip — would need a
mock OIDC server or Playwright we don't have. Replaced with a manual
smoke-test plan.

**Manual smoke test (prod-readiness checklist):**

1. Covermesh admin (Don) → Microsoft button → lands on `/admin`; DB has
   new `accounts` row, `role` still `admin`.
2. New covermesh user → Microsoft button → auto-provisioned
   `role='broker'`, lands on `/broker`.
3. Personal Microsoft account → rejected with
   `/login?error=AccessDenied`.
4. Covermesh user types `@covermesh.com` into magic-link form →
   inline `TrustedDomainMustUseSSO` banner, no magic-link email sent,
   no row in `verification_tokens`.
5. External client (gmail or muster-logistik.de) → magic-link still
   works end-to-end.

**CI gates:** existing `npm run lint`, `npm test`, and Vercel build must
pass.

## Open questions for implementation

Design decisions resolved:

- Q1 Magic-link coexistence → B (trusted-domain gate)
- Q2 Provider config → A (one multi-tenant provider + tid allowlist)
- Q3 Allowlist storage → A (hardcoded typed map)

Deferred to the plan phase:

- **Role-on-first-Entra-signin mechanism** (adapter override vs
  `events.signIn` vs schema default). Preference stated above (option 1).
- **Exact source of the `tid` claim** in the `signIn` callback
  (`profile.tid` vs decoded `id_token`) — discover during
  implementation against the installed Auth.js version.

## Appendix — linked work

- BL-009 (closed 2026-04-21) was originally titled "MS Entra
  authentication + RBAC"; it shipped email magic-link + RBAC. A new
  backlog item will be filed for this Entra work.
- BL-051 (admin user edit UI) — provides a long-term replacement for
  the one-shot `promote-to-admin.ts` script.
- BL-048 (credit ledger) — unrelated but was the follow-up to BL-040
  closed in the same RBAC cleanup.
- Reference: `~/covermesh-PPP/covermesh-ppp/lib/auth.config.ts` and
  `lib/auth.ts` — single-tenant JWT variant of the same pattern; ours
  differs in three ways: multi-tenant issuer, DB sessions (not JWT),
  `accounts`-table linkage (no `microsoftId` column on `users`).

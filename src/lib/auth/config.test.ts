import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// next-auth/lib/env.js does `import { NextRequest } from "next/server"` but
// the `next` package lacks a package.json "exports" field, so vitest's ESM
// resolver can't find `next/server` without its `.js` suffix. Stub it — this
// test doesn't exercise the request-handling path.
vi.mock("next/server", () => ({
  NextRequest: class NextRequest {},
  NextResponse: class NextResponse {},
}));

// Mock the DB import chain used by authConfig's adapter so importing
// config.ts doesn't pull in a real DB client.
vi.mock("@/lib/db", () => ({
  db: {},
}));

// Avoid pulling the DrizzleAdapter's concrete schema evaluation.
vi.mock("@/lib/db/schema", () => ({
  users: {},
  accounts: {},
  sessions: {},
  verificationTokens: {},
  clients: {},
}));

// DrizzleAdapter sniffs the db client shape at construction time and throws
// on our `{}` stub. The signIn callback doesn't touch the adapter — stub it.
vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: () => ({}),
}));

vi.mock("./send-magic-link", () => ({
  sendMagicLink: vi.fn(),
}));

import { authConfig } from "./config";

type SignInArgs = Parameters<NonNullable<typeof authConfig.callbacks>["signIn"] & Function>[0];

async function callSignIn(args: Partial<SignInArgs>) {
  const fn = authConfig.callbacks!.signIn!;
  return fn(args as SignInArgs);
}

beforeEach(() => {
  process.env.ENTRA_COVERMESH_TENANT_ID = "00000000-0000-0000-0000-000000000001";
});

afterEach(() => {
  delete process.env.ENTRA_COVERMESH_TENANT_ID;
});

describe("authConfig.callbacks.signIn — trusted-domain email gate", () => {
  it("returns false for an @covermesh.com magic-link sign-in", async () => {
    const result = await callSignIn({
      user: { email: "someone@covermesh.com", id: "u1" } as never,
      account: { provider: "email", providerAccountId: "x", type: "email" } as never,
    });
    expect(result).toBe(false);
  });

  it("returns true for an @gmail.com magic-link sign-in", async () => {
    const result = await callSignIn({
      user: { email: "someone@gmail.com", id: "u1" } as never,
      account: { provider: "email", providerAccountId: "x", type: "email" } as never,
    });
    expect(result).toBe(true);
  });

  it("returns true when account is null (defensive)", async () => {
    const result = await callSignIn({
      user: { email: "someone@covermesh.com", id: "u1" } as never,
      account: null as never,
    });
    expect(result).toBe(true);
  });
});

describe("authConfig.callbacks.signIn — Entra tenant + domain validation", () => {
  it("returns true for a valid tid + matching email domain (profile.tid present)", async () => {
    const result = await callSignIn({
      user: { email: "someone@covermesh.com", id: "u1" } as never,
      account: { provider: "microsoft-entra-id", providerAccountId: "o1", type: "oauth" } as never,
      profile: { tid: "00000000-0000-0000-0000-000000000001" } as never,
    });
    expect(result).toBe(true);
  });

  it("returns false when tid is not in the allowlist", async () => {
    const result = await callSignIn({
      user: { email: "someone@covermesh.com", id: "u1" } as never,
      account: { provider: "microsoft-entra-id", providerAccountId: "o1", type: "oauth" } as never,
      profile: { tid: "deadbeef-0000-0000-0000-000000000000" } as never,
    });
    expect(result).toBe(false);
  });

  it("returns false when the email domain does not match the tenant", async () => {
    const result = await callSignIn({
      user: { email: "someone@evil.com", id: "u1" } as never,
      account: { provider: "microsoft-entra-id", providerAccountId: "o1", type: "oauth" } as never,
      profile: { tid: "00000000-0000-0000-0000-000000000001" } as never,
    });
    expect(result).toBe(false);
  });

  it("decodes tid from id_token when profile.tid is absent", async () => {
    // Hand-rolled minimal id_token: header.payload.signature, payload has tid.
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ tid: "00000000-0000-0000-0000-000000000001" })
    ).toString("base64url");
    const idToken = `${header}.${payload}.sig`;

    const result = await callSignIn({
      user: { email: "someone@covermesh.com", id: "u1" } as never,
      account: {
        provider: "microsoft-entra-id",
        providerAccountId: "o1",
        type: "oauth",
        id_token: idToken,
      } as never,
      profile: null as never,
    });
    expect(result).toBe(true);
  });
});

describe("authConfig — Entra provider profile() shape", () => {
  // The Drizzle adapter's createUser spreads profile() into the users insert.
  // Because users.role is NOT NULL with no default, profile() MUST return
  // role: "broker" so first-time Entra users don't fail the DB constraint.
  // Regression guard: this test fails loudly if anyone drops the field.
  //
  // Note on access path: Auth.js v5 stores the user-supplied profile callback
  // on `provider.options.profile`, not `provider.profile` — the top-level
  // `profile` is the upstream default that fetches a photo from MS Graph.
  function getCustomProfile(): (p: Record<string, unknown>) => Record<string, unknown> {
    const entra = authConfig.providers.find((p) => {
      return typeof p === "object" && p !== null && "id" in p && (p as { id: unknown }).id === "microsoft-entra-id";
    });
    if (!entra) throw new Error("Entra provider not found on authConfig.providers");
    const options = (entra as { options?: { profile?: unknown } }).options;
    if (typeof options?.profile !== "function") {
      throw new Error("Custom profile function not found on provider.options");
    }
    return options.profile as (p: Record<string, unknown>) => Record<string, unknown>;
  }

  it("returns role='broker' and clientId=null for a new Entra user", () => {
    const profile = getCustomProfile();
    const result = profile({
      sub: "sub-123",
      oid: "oid-abc",
      name: "Test Covermesh",
      email: "test@covermesh.com",
      preferred_username: "test@covermesh.com",
    });

    expect(result).toMatchObject({
      id: "sub-123",
      name: "Test Covermesh",
      email: "test@covermesh.com",
      image: null,
      role: "broker",
      clientId: null,
    });
  });

  it("falls back to oid when sub is absent, and to preferred_username when email is absent", () => {
    const profile = getCustomProfile();
    const result = profile({
      oid: "oid-abc",
      name: "Fallback User",
      preferred_username: "fallback@covermesh.com",
    });

    expect(result).toMatchObject({
      id: "oid-abc",
      email: "fallback@covermesh.com",
      role: "broker",
      clientId: null,
    });
  });
});

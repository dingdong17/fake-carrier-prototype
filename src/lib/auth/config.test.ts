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

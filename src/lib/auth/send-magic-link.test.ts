import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the DB lookup to avoid hitting Turso in unit tests.
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    }),
  },
}));

// Mock rate-limit so we always allow the request.
vi.mock("./rate-limit", () => ({
  allowMagicLinkRequest: vi.fn().mockResolvedValue(true),
}));

import { sendMagicLink } from "./send-magic-link";

beforeEach(() => {
  process.env.ENTRA_COVERMESH_TENANT_ID = "00000000-0000-0000-0000-000000000001";
  process.env.RESEND_API_KEY = ""; // force dev-stub path
});

afterEach(() => {
  delete process.env.ENTRA_COVERMESH_TENANT_ID;
  delete process.env.RESEND_API_KEY;
});

describe("sendMagicLink — trusted-domain precheck", () => {
  it("throws AccessDenied for an @covermesh.com email", async () => {
    await expect(
      sendMagicLink({
        identifier: "someone@covermesh.com",
        url: "http://localhost:3000/api/auth/callback/email?token=x",
        provider: {},
      })
    ).rejects.toThrow(/AccessDenied/);
  });

  it("does not throw for an @gmail.com email (silent dev-stub path)", async () => {
    await expect(
      sendMagicLink({
        identifier: "someone@gmail.com",
        url: "http://localhost:3000/api/auth/callback/email?token=x",
        provider: {},
      })
    ).resolves.toBeUndefined();
  });
});

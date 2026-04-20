// src/lib/auth/session.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth/config";
import { requireRole, assertClientScope, type Role } from "./session";

const mkSession = (overrides: Partial<Session["user"]> = {}): Session => ({
  expires: new Date(Date.now() + 60_000).toISOString(),
  user: {
    id: "u1",
    email: "x@y.z",
    name: "X",
    role: "client",
    clientId: "c1",
    clientSlug: "acme",
    ...overrides,
  },
});

describe("requireRole", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the session user when role matches", async () => {
    (auth as unknown as vi.Mock).mockResolvedValue(mkSession({ role: "admin" }));
    const u = await requireRole("admin");
    expect(u.role).toBe("admin");
  });

  it("throws when no session", async () => {
    (auth as unknown as vi.Mock).mockResolvedValue(null);
    await expect(requireRole("admin")).rejects.toThrow(/not authenticated/i);
  });

  it("throws when role mismatch", async () => {
    (auth as unknown as vi.Mock).mockResolvedValue(mkSession({ role: "client" }));
    await expect(requireRole("admin")).rejects.toThrow(/forbidden/i);
  });

  it("accepts any of multiple roles", async () => {
    (auth as unknown as vi.Mock).mockResolvedValue(mkSession({ role: "broker" }));
    const u = await requireRole(["broker", "admin"] as Role[]);
    expect(u.role).toBe("broker");
  });
});

describe("assertClientScope", () => {
  it("allows admin for any slug", () => {
    const u = mkSession({ role: "admin", clientId: null, clientSlug: null }).user;
    expect(() => assertClientScope(u, "anything")).not.toThrow();
  });

  it("allows broker for any slug", () => {
    const u = mkSession({ role: "broker", clientId: null, clientSlug: null }).user;
    expect(() => assertClientScope(u, "anything")).not.toThrow();
  });

  it("allows client for own slug", () => {
    const u = mkSession({ role: "client", clientSlug: "acme" }).user;
    expect(() => assertClientScope(u, "acme")).not.toThrow();
  });

  it("rejects client for foreign slug", () => {
    const u = mkSession({ role: "client", clientSlug: "acme" }).user;
    expect(() => assertClientScope(u, "bravo")).toThrow(/forbidden/i);
  });
});

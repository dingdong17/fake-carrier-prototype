import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isTrustedDomain,
  tenantForEmail,
  validateEntraSignIn,
  TENANT_ALLOWLIST,
} from "./entra-tenants";

const COVERMESH_TID = "00000000-0000-0000-0000-000000000001";

beforeEach(() => {
  process.env.ENTRA_COVERMESH_TENANT_ID = COVERMESH_TID;
});

afterEach(() => {
  delete process.env.ENTRA_COVERMESH_TENANT_ID;
});

describe("TENANT_ALLOWLIST", () => {
  it("maps the covermesh tenant id to covermesh.com", () => {
    expect(TENANT_ALLOWLIST()[COVERMESH_TID]).toEqual({
      emailDomain: "covermesh.com",
      displayName: "covermesh",
    });
  });
});

describe("isTrustedDomain", () => {
  it("returns true for covermesh.com (lowercase)", () => {
    expect(isTrustedDomain("someone@covermesh.com")).toBe(true);
  });
  it("returns true for COVERMESH.COM (uppercase)", () => {
    expect(isTrustedDomain("SOMEONE@COVERMESH.COM")).toBe(true);
  });
  it("returns false for gmail.com", () => {
    expect(isTrustedDomain("someone@gmail.com")).toBe(false);
  });
  it("returns false for malformed email without @", () => {
    expect(isTrustedDomain("not-an-email")).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(isTrustedDomain("")).toBe(false);
  });
});

describe("tenantForEmail", () => {
  it("returns the covermesh config for an @covermesh.com email", () => {
    expect(tenantForEmail("x@covermesh.com")?.emailDomain).toBe(
      "covermesh.com"
    );
  });
  it("returns null for @gmail.com", () => {
    expect(tenantForEmail("x@gmail.com")).toBeNull();
  });
});

describe("validateEntraSignIn", () => {
  it("ok when tid and email domain both match an allowlist entry", () => {
    expect(
      validateEntraSignIn({ tid: COVERMESH_TID, email: "x@covermesh.com" })
    ).toEqual({ ok: true });
  });
  it("unknown_tenant when tid is not in allowlist", () => {
    expect(
      validateEntraSignIn({ tid: "deadbeef", email: "x@covermesh.com" })
    ).toEqual({ ok: false, reason: "unknown_tenant" });
  });
  it("domain_mismatch when tid is known but email domain doesn't match", () => {
    expect(
      validateEntraSignIn({ tid: COVERMESH_TID, email: "x@evil.com" })
    ).toEqual({ ok: false, reason: "domain_mismatch" });
  });
  it("rejects empty tid", () => {
    expect(
      validateEntraSignIn({ tid: "", email: "x@covermesh.com" })
    ).toEqual({ ok: false, reason: "unknown_tenant" });
  });
});

import { describe, it, expect } from "vitest";
import {
  generateConfirmToken,
  isTokenExpired,
  tokensEqual,
  TOKEN_TTL_MS,
} from "./tokens";

describe("generateConfirmToken", () => {
  it("returns a URL-safe base64 string", () => {
    const t = generateConfirmToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes → 43 base64url chars (no padding)
    expect(t.length).toBeGreaterThanOrEqual(40);
  });

  it("returns unique tokens across calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(generateConfirmToken());
    expect(seen.size).toBe(50);
  });
});

describe("isTokenExpired", () => {
  it("is false when now is before expiry", () => {
    expect(isTokenExpired(Date.now() + 1000, Date.now())).toBe(false);
  });
  it("is true when now is past expiry", () => {
    expect(isTokenExpired(Date.now() - 1, Date.now())).toBe(true);
  });
  it("TTL is 7 days", () => {
    expect(TOKEN_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("tokensEqual", () => {
  it("matches identical strings", () => {
    expect(tokensEqual("abc", "abc")).toBe(true);
  });
  it("rejects different same-length strings", () => {
    expect(tokensEqual("abc", "abd")).toBe(false);
  });
  it("rejects different-length strings", () => {
    expect(tokensEqual("abc", "abcd")).toBe(false);
  });
  it("rejects non-strings defensively", () => {
    // @ts-expect-error intentionally passing non-string
    expect(tokensEqual(null, "abc")).toBe(false);
  });
});

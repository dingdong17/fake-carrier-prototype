import { randomBytes, timingSafeEqual } from "crypto";

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateConfirmToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isTokenExpired(expiresMs: number, now = Date.now()): boolean {
  return now > expiresMs;
}

/** Constant-time comparison of two tokens. Returns false for any length mismatch. */
export function tokensEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

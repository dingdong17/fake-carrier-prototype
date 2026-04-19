import { describe, it, expect } from "vitest";
import { sanitizeErrorMessage } from "./sanitize";

describe("sanitizeErrorMessage", () => {
  it("classifies Anthropic auth errors as missing_credentials", () => {
    const result = sanitizeErrorMessage(
      'Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted'
    );
    expect(result.code).toBe("missing_credentials");
    expect(result.message).toMatch(/Anmeldedaten|KI-Service/);
  });

  it("classifies rate-limit errors", () => {
    expect(sanitizeErrorMessage("429 Too Many Requests").code).toBe("rate_limited");
    expect(sanitizeErrorMessage("rate limit exceeded").code).toBe("rate_limited");
  });

  it("classifies timeout errors", () => {
    expect(sanitizeErrorMessage("Extraction: Zeitüberschreitung nach 180s").code).toBe("timeout");
    expect(sanitizeErrorMessage("request timed out").code).toBe("timeout");
  });

  it("classifies network errors", () => {
    expect(sanitizeErrorMessage("fetch failed: ECONNREFUSED").code).toBe("network");
    expect(sanitizeErrorMessage("getaddrinfo ENOTFOUND api.anthropic.com").code).toBe("network");
  });

  it("classifies file-too-large errors", () => {
    expect(sanitizeErrorMessage("413 payload too large").code).toBe("file_too_large");
  });

  it("classifies unsupported-format errors", () => {
    expect(sanitizeErrorMessage("unsupported file format").code).toBe("unsupported_format");
    expect(sanitizeErrorMessage("malformed PDF").code).toBe("unsupported_format");
  });

  it("falls back to unknown for unrecognized messages", () => {
    expect(sanitizeErrorMessage("something weird happened").code).toBe("unknown");
  });

  it("redacts API key-like strings", () => {
    const result = sanitizeErrorMessage("Failed to auth with sk-ant-api03-abc123DEF456ghi789JKL0mnOPQrstUVWxyz");
    expect(result.message).not.toContain("sk-ant-api03-abc123DEF456ghi789JKL0mnOPQrstUVWxyz");
  });

  it("redacts absolute filesystem paths", () => {
    const result = sanitizeErrorMessage("ENOENT: /Users/don/FakeCarrier/uploads/abc/doc.pdf not found");
    expect(result.message).not.toContain("/Users/don/FakeCarrier");
  });

  it("handles null/undefined/empty input", () => {
    expect(sanitizeErrorMessage(null).code).toBe("unknown");
    expect(sanitizeErrorMessage(undefined).code).toBe("unknown");
    expect(sanitizeErrorMessage("").code).toBe("unknown");
  });

  it("truncates very long messages", () => {
    const longMsg = "x".repeat(1000);
    const result = sanitizeErrorMessage(longMsg);
    expect(result.message.length).toBeLessThan(500);
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { logForensicError } from "./log-forensic-error";

describe("logForensicError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs to console.error with [FORENSIC_ERROR] prefix and context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logForensicError("analyzePdf", new Error("something broke"));
    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0].join(" ");
    expect(call).toContain("[FORENSIC_ERROR]");
    expect(call).toContain("analyzePdf");
  });

  it("sanitizes network error messages into the user-facing German code", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logForensicError("analyzeImage", new Error("fetch failed: ECONNREFUSED"));
    const call = spy.mock.calls[0].join(" ");
    expect(call).toMatch(/Netzwerkfehler/);
  });

  it("redacts Anthropic-style API keys", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logForensicError(
      "analyzePdf",
      new Error("auth failed with sk-ant-api03-abcdefghijklmnop1234567890ABCDEFGHIJ")
    );
    const call = spy.mock.calls[0].join(" ");
    expect(call).not.toContain("sk-ant-api03-abcdefghijklmnop");
  });

  it("handles non-Error values (strings, null)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logForensicError("analyzePdf", "raw string failure");
    logForensicError("analyzeImage", null);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

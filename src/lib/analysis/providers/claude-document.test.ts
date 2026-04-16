import { describe, it, expect } from "vitest";

// Test the timeout and error handling behavior.
// We can't easily mock the Anthropic SDK, but we can test the
// helper functions and verify the module structure.

describe("claude-document provider structure", () => {
  it("exports classifyDocument function", async () => {
    const mod = await import("./claude-document");
    expect(typeof mod.classifyDocument).toBe("function");
  });

  it("exports claudeDocumentProvider with correct interface", async () => {
    const mod = await import("./claude-document");
    expect(mod.claudeDocumentProvider.id).toBe("claude-document");
    expect(mod.claudeDocumentProvider.name).toBe("Claude Document Analysis");
    expect(typeof mod.claudeDocumentProvider.analyze).toBe("function");
  });

  it("exports timeout constants", async () => {
    const mod = await import("./claude-document");
    expect(typeof mod.CLASSIFY_TIMEOUT_MS).toBe("number");
    expect(mod.CLASSIFY_TIMEOUT_MS).toBe(60000);
    expect(typeof mod.ANALYSIS_TIMEOUT_MS).toBe("number");
    expect(mod.ANALYSIS_TIMEOUT_MS).toBe(120000);
  });
});

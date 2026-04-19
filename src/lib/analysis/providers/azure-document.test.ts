import { describe, it, expect } from "vitest";

// Test the module structure. We can't easily mock the OpenAI SDK inline,
// but we can verify the public surface that the rest of the app relies on.

describe("azure-document provider structure", () => {
  it("exports classifyDocument function", async () => {
    const mod = await import("./azure-document");
    expect(typeof mod.classifyDocument).toBe("function");
  });

  it("exports azureDocumentProvider with correct interface", async () => {
    const mod = await import("./azure-document");
    expect(mod.azureDocumentProvider.id).toBe("azure-document");
    expect(mod.azureDocumentProvider.name).toBe("Azure OpenAI Document Analysis");
    expect(typeof mod.azureDocumentProvider.analyze).toBe("function");
  });

  it("exports timeout constants", async () => {
    const mod = await import("./azure-document");
    expect(typeof mod.CLASSIFY_TIMEOUT_MS).toBe("number");
    expect(mod.CLASSIFY_TIMEOUT_MS).toBe(90000);
    expect(typeof mod.ANALYSIS_TIMEOUT_MS).toBe("number");
    expect(mod.ANALYSIS_TIMEOUT_MS).toBe(180000);
  });
});

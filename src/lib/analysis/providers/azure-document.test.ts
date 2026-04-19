import { describe, it, expect, type TestContext } from "vitest";
import { statSync, readFileSync } from "fs";
import path from "path";

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

describe("azure-document PDF text extraction", () => {
  it("extracts text from a sample insurance PDF (pdf-parse)", async (ctx: TestContext) => {
    const mod = await import("./azure-document");
    const samplePath = path.join(
      process.cwd(),
      "Samples/Versicherungsbestatigung-verkehrshaftung-2025.pdf"
    );
    try {
      statSync(samplePath);
    } catch {
      ctx.skip();
    }
    const buffer = readFileSync(samplePath);
    const text = await mod.extractPdfText(buffer, 5);
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(500);
    expect(text).toContain("Versicherung");
  });
});

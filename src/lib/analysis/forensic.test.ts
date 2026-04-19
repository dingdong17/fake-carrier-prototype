import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { runForensicAnalysis, applyForensicAnalysis } from "./forensic";
import type { ProviderResult } from "./providers/types";

function baseResult(): ProviderResult {
  return {
    providerId: "azure-document",
    documentType: "insurance-cert",
    extraction: {
      fields: { policyNumber: "123" },
      confidence: 0.9,
      riskSignals: [],
      missingFields: [],
    },
  };
}

describe("runForensicAnalysis", () => {
  it("routes image MIME types to the image analyzer", async () => {
    const buffer = readFileSync(
      path.join(process.cwd(), "public/ecclesia-logo-white.png")
    );
    const result = await runForensicAnalysis(buffer, "image/png");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("image");
    expect(Array.isArray(result?.riskSignals)).toBe(true);
  });

  it("routes application/pdf to the PDF analyzer", async () => {
    const buffer = readFileSync(
      path.join(
        process.cwd(),
        "Samples/Versicherungsbestatigung-verkehrshaftung-2025.pdf"
      )
    );
    const result = await runForensicAnalysis(buffer, "application/pdf");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("pdf");
    expect(Array.isArray(result?.riskSignals)).toBe(true);
  });

  it("returns null for unsupported MIME types", async () => {
    const buffer = Buffer.from("plain text");
    const result = await runForensicAnalysis(buffer, "text/plain");
    expect(result).toBeNull();
  });
});

describe("applyForensicAnalysis", () => {
  it("merges PDF forensic metadata into result.extraction.fields.forensicMetadata", async () => {
    const buffer = readFileSync(
      path.join(
        process.cwd(),
        "Samples/asko-versicherungsvertrag-gesamt-police-kabotage-2025.pdf"
      )
    );
    const merged = await applyForensicAnalysis(baseResult(), buffer, "application/pdf");
    expect(merged.extraction.fields.forensicMetadata).toBeDefined();
    const meta = merged.extraction.fields.forensicMetadata as Record<string, unknown>;
    expect(meta.Producer).toBe("DocuWare PDF");
  });

  it("preserves existing fields when merging", async () => {
    const buffer = readFileSync(
      path.join(
        process.cwd(),
        "Samples/asko-versicherungsvertrag-gesamt-police-kabotage-2025.pdf"
      )
    );
    const merged = await applyForensicAnalysis(baseResult(), buffer, "application/pdf");
    expect(merged.extraction.fields.policyNumber).toBe("123");
  });

  it("returns the result unchanged for unsupported MIME types", async () => {
    const buffer = Buffer.from("plain text");
    const input = baseResult();
    const merged = await applyForensicAnalysis(input, buffer, "text/plain");
    expect(merged.extraction.fields.forensicMetadata).toBeUndefined();
    expect(merged.extraction.riskSignals).toEqual([]);
  });
});

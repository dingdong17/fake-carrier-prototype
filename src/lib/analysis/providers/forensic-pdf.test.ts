import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { evaluatePdfMetadata, analyzePdf } from "./forensic-pdf";

describe("evaluatePdfMetadata", () => {
  it("flags online editor fingerprint when Producer is iLovePDF", () => {
    const signals = evaluatePdfMetadata(
      { Producer: "iLovePDF", Creator: "Microsoft Word" },
      0,
      false
    );
    expect(signals).toContainEqual(
      expect.objectContaining({
        rule: "pdf-online-editor",
        severity: "major",
        points: 30,
      })
    );
  });

  it("flags online editor fingerprint for Smallpdf, Sejda, PDFescape, Soda PDF, online2pdf", () => {
    for (const producer of ["Smallpdf", "Sejda", "PDFescape", "Soda PDF Desktop", "online2pdf.com"]) {
      const signals = evaluatePdfMetadata({ Producer: producer }, 0, false);
      expect(signals.some((s) => s.rule === "pdf-online-editor")).toBe(true);
    }
  });

  it("flags incremental updates when prevCount > 0", () => {
    const signals = evaluatePdfMetadata({ Producer: "Microsoft Word" }, 2, false);
    expect(signals).toContainEqual(
      expect.objectContaining({
        rule: "pdf-incremental-updates",
        severity: "major",
        points: 25,
      })
    );
  });

  it("flags embedded JavaScript when hasJS is true", () => {
    const signals = evaluatePdfMetadata({ Producer: "Microsoft Word" }, 0, true);
    expect(signals).toContainEqual(
      expect.objectContaining({
        rule: "pdf-embedded-javascript",
        severity: "critical",
        points: 45,
      })
    );
  });

  it("flags missing metadata when info has no Producer/Creator/Author/Title", () => {
    const signals = evaluatePdfMetadata({}, 0, false);
    expect(signals).toContainEqual(
      expect.objectContaining({
        rule: "pdf-no-metadata",
        severity: "minor",
        points: 15,
      })
    );
  });

  it("flags date inconsistency when ModDate is before CreationDate", () => {
    const signals = evaluatePdfMetadata(
      {
        Producer: "Microsoft Word",
        CreationDate: "D:20250601120000Z",
        ModDate: "D:20240101120000Z",
      },
      0,
      false
    );
    expect(signals).toContainEqual(
      expect.objectContaining({
        rule: "pdf-date-inconsistency",
        severity: "minor",
        points: 10,
      })
    );
  });

  it("flags date inconsistency when ModDate is more than 5 years after CreationDate", () => {
    const signals = evaluatePdfMetadata(
      {
        Producer: "Microsoft Word",
        CreationDate: "D:20180101120000Z",
        ModDate: "D:20260101120000Z",
      },
      0,
      false
    );
    expect(signals.some((s) => s.rule === "pdf-date-inconsistency")).toBe(true);
  });

  it("returns no signals for a clean PDF from Microsoft Word", () => {
    const signals = evaluatePdfMetadata(
      {
        Producer: "Microsoft Word",
        Creator: "Microsoft Word",
        Author: "John Doe",
        Title: "Contract",
        CreationDate: "D:20250601120000Z",
        ModDate: "D:20250601120500Z",
      },
      0,
      false
    );
    expect(signals).toEqual([]);
  });
});

describe("analyzePdf (integration)", () => {
  it("returns metadata + riskSignals for a real PDF", async () => {
    const pdfPath = path.join(
      process.cwd(),
      "Samples/Versicherungsbestatigung-verkehrshaftung-2025.pdf"
    );
    const buffer = readFileSync(pdfPath);
    const result = await analyzePdf(buffer);
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("riskSignals");
    expect(Array.isArray(result.riskSignals)).toBe(true);
    expect(typeof result.metadata).toBe("object");
  });
});

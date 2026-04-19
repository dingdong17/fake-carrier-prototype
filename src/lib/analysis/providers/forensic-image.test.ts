import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { evaluateImageMetadata, analyzeImage } from "./forensic-image";

describe("evaluateImageMetadata", () => {
  it("flags editing software when Software tag contains Photoshop", () => {
    const signals = evaluateImageMetadata({
      Software: "Adobe Photoshop CC 2024",
      Make: "Canon",
      Model: "EOS R5",
      DateTimeOriginal: "2025:06:01 12:00:00",
      ModifyDate: "2025:06:01 12:00:00",
    });

    expect(signals).toContainEqual(
      expect.objectContaining({
        rule: "image-editing-software",
        severity: "major",
        points: 30,
      })
    );
  });

  it("flags editing software for Lightroom, GIMP, Pixelmator, Affinity", () => {
    for (const software of ["Lightroom 13.0", "GIMP 2.10", "Pixelmator Pro 3.4", "Affinity Photo 2"]) {
      const signals = evaluateImageMetadata({ Software: software });
      expect(signals.some((s) => s.rule === "image-editing-software")).toBe(true);
    }
  });

  it("returns no signals for a clean consumer-camera EXIF", () => {
    const signals = evaluateImageMetadata({
      Make: "Canon",
      Model: "EOS R5",
      Software: "Canon EOS R5 Ver. 1.8.1",
      DateTimeOriginal: "2025:06:01 12:00:00",
      ModifyDate: "2025:06:01 12:00:00",
      GPSLatitude: 52.52,
      GPSLongitude: 13.405,
    });
    expect(signals).toEqual([]);
  });

  it("flags missing metadata when the EXIF object is empty", () => {
    const signals = evaluateImageMetadata({});
    expect(signals).toContainEqual(
      expect.objectContaining({
        rule: "image-no-metadata",
        severity: "minor",
        points: 15,
      })
    );
  });

  it("flags date inconsistency when DateTimeOriginal and ModifyDate differ by more than 24h", () => {
    const signals = evaluateImageMetadata({
      Make: "Canon",
      Model: "EOS R5",
      DateTimeOriginal: "2025:06:01 12:00:00",
      ModifyDate: "2025:06:05 12:00:00",
    });
    expect(signals).toContainEqual(
      expect.objectContaining({
        rule: "image-date-inconsistency",
        severity: "minor",
        points: 10,
      })
    );
  });

  it("does not flag date inconsistency when dates are within 24h", () => {
    const signals = evaluateImageMetadata({
      Make: "Canon",
      Model: "EOS R5",
      DateTimeOriginal: "2025:06:01 12:00:00",
      ModifyDate: "2025:06:01 23:00:00",
    });
    expect(signals.some((s) => s.rule === "image-date-inconsistency")).toBe(false);
  });
});

describe("analyzeImage (integration)", () => {
  it("returns metadata + riskSignals for a PNG with no EXIF", async () => {
    const buffer = readFileSync(path.join(process.cwd(), "public/ecclesia-logo-white.png"));
    const result = await analyzeImage(buffer);
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("riskSignals");
    expect(Array.isArray(result.riskSignals)).toBe(true);
    expect(result.riskSignals.some((s) => s.rule === "image-no-metadata")).toBe(true);
  });
});

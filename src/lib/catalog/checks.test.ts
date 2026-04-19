import { describe, it, expect } from "vitest";
import {
  CHECK_CATALOG,
  getCheckById,
  getChecksByCategory,
} from "./checks";

describe("CHECK_CATALOG", () => {
  it("contains at least one entry per category", () => {
    const categories = new Set(CHECK_CATALOG.map((c) => c.category));
    expect(categories.has("forensic")).toBe(true);
    expect(categories.has("external-registry")).toBe(true);
    expect(categories.has("document-extraction")).toBe(true);
  });

  it("has unique IDs", () => {
    const ids = CHECK_CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all forensic rule IDs emitted by the analyzers", () => {
    const required = [
      "image-editing-software",
      "image-no-metadata",
      "image-date-inconsistency",
      "pdf-online-editor",
      "pdf-incremental-updates",
      "pdf-embedded-javascript",
      "pdf-no-metadata",
      "pdf-date-inconsistency",
    ];
    const ids = new Set(CHECK_CATALOG.map((c) => c.id));
    for (const r of required) {
      expect(ids.has(r), `missing catalog entry for ${r}`).toBe(true);
    }
  });

  it("every entry has non-trivial name, description, source, and scoreImpact", () => {
    for (const c of CHECK_CATALOG) {
      expect(c.name.length, c.id).toBeGreaterThan(5);
      expect(c.description.length, c.id).toBeGreaterThan(80);
      expect(c.source.length, c.id).toBeGreaterThan(5);
      expect(c.scoreImpact.passed).toBeDefined();
      expect(c.scoreImpact.failed).toBeDefined();
      expect(c.scoreImpact.skipped).toBeDefined();
    }
  });

  it("every entry declares a tier availability", () => {
    const valid = new Set(["quick", "medium", "full"]);
    for (const c of CHECK_CATALOG) {
      expect(valid.has(c.availability), c.id).toBe(true);
    }
  });
});

describe("getCheckById", () => {
  it("returns the matching entry", () => {
    const c = getCheckById("pdf-online-editor");
    expect(c?.id).toBe("pdf-online-editor");
  });

  it("returns undefined for unknown ids", () => {
    expect(getCheckById("nope")).toBeUndefined();
  });
});

describe("getChecksByCategory", () => {
  it("returns only the matching category", () => {
    const forensic = getChecksByCategory("forensic");
    expect(forensic.length).toBeGreaterThan(0);
    expect(forensic.every((c) => c.category === "forensic")).toBe(true);
  });
});

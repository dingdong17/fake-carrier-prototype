import { describe, it, expect } from "vitest";
import {
  DOCUMENT_TYPES,
  getDocumentType,
  getRequiredDocumentTypes,
  getAllDocumentTypes,
  getTotalConfidenceWeight,
} from "./document-types";

describe("DOCUMENT_TYPES", () => {
  it("has 6 document types", () => {
    expect(Object.keys(DOCUMENT_TYPES)).toHaveLength(6);
  });

  it("insurance-cert is required", () => {
    expect(DOCUMENT_TYPES["insurance-cert"].required).toBe(true);
  });

  it("all other types are optional", () => {
    const optional = Object.values(DOCUMENT_TYPES).filter((dt) => dt.id !== "insurance-cert");
    expect(optional.every((dt) => dt.required === false)).toBe(true);
  });

  it("each type has a German label", () => {
    for (const dt of Object.values(DOCUMENT_TYPES)) {
      expect(dt.labelDe).toBeTruthy();
    }
  });

  it("each type has required fields defined", () => {
    for (const dt of Object.values(DOCUMENT_TYPES)) {
      expect(dt.requiredFields.length).toBeGreaterThan(0);
    }
  });

  it("each type has red flag rules defined", () => {
    for (const dt of Object.values(DOCUMENT_TYPES)) {
      expect(dt.redFlagRules.length).toBeGreaterThan(0);
    }
  });
});

describe("getDocumentType", () => {
  it("returns config for known type", () => {
    const config = getDocumentType("insurance-cert");
    expect(config).toBeDefined();
    expect(config!.labelDe).toBe("Versicherungsnachweis");
  });

  it("returns undefined for unknown type", () => {
    expect(getDocumentType("nonexistent")).toBeUndefined();
  });
});

describe("getRequiredDocumentTypes", () => {
  it("returns only required types", () => {
    const required = getRequiredDocumentTypes();
    expect(required.every((dt) => dt.required === true)).toBe(true);
  });

  it("includes insurance-cert", () => {
    const required = getRequiredDocumentTypes();
    expect(required.some((dt) => dt.id === "insurance-cert")).toBe(true);
  });
});

describe("getAllDocumentTypes", () => {
  it("returns all 6 types", () => {
    expect(getAllDocumentTypes()).toHaveLength(6);
  });
});

describe("getTotalConfidenceWeight", () => {
  it("sums to 1.0", () => {
    expect(getTotalConfidenceWeight()).toBeCloseTo(1.0, 5);
  });
});

import { describe, it, expect } from "vitest";
import { validateVatNumber } from "./vies-vat";

describe("validateVatNumber — input parsing", () => {
  it("rejects empty string", async () => {
    const result = await validateVatNumber("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Ungültiges Format");
  });

  it("rejects number-only input (no country code)", async () => {
    const result = await validateVatNumber("123456789");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Ungültiges Format");
  });

  it("rejects single-letter prefix", async () => {
    const result = await validateVatNumber("D123456789");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Ungültiges Format");
  });

  it("parses valid DE format correctly", async () => {
    const result = await validateVatNumber("DE124906368");
    // Parsing should succeed (no format error), API might timeout
    expect(result.countryCode).toBe("DE");
    expect(result.vatNumber).toBe("124906368");
    expect(result.error === null || !result.error.includes("Ungültiges Format")).toBe(true);
  }, 20000);

  it("strips spaces from VAT ID", async () => {
    const result = await validateVatNumber("DE 124 906 368");
    expect(result.countryCode).toBe("DE");
    expect(result.vatNumber).toBe("124906368");
    expect(result.error === null || !result.error.includes("Ungültiges Format")).toBe(true);
  }, 20000);

  it("handles lowercase country code", async () => {
    const result = await validateVatNumber("de124906368");
    expect(result.countryCode).toBe("DE");
  }, 20000);
});

describe("validateVatNumber — real VIES API", () => {
  it("validates a known valid German VAT number", async () => {
    const result = await validateVatNumber("DE124906368");
    expect(result.countryCode).toBe("DE");
    // VIES API may be rate-limited or temporarily unavailable
    // Accept: valid=true OR an error from the service (not a parse error)
    const isApiOk = result.valid === true;
    const isApiDown = result.error !== null && !result.error.includes("Ungültiges Format");
    expect(isApiOk || isApiDown).toBe(true);
  }, 20000);

  it("rejects a known invalid VAT number", async () => {
    const result = await validateVatNumber("DE999999999");
    if (!result.error?.includes("fehlgeschlagen") && !result.error?.includes("nicht erreichbar")) {
      expect(result.valid).toBe(false);
    }
  }, 20000);

  it("validates a known valid Polish VAT and returns company name", async () => {
    const result = await validateVatNumber("PL7740001454", "ORLEN");
    if (!result.error?.includes("fehlgeschlagen") && !result.error?.includes("nicht erreichbar")) {
      expect(result.valid).toBe(true);
      expect(result.registeredName).toBeTruthy();
    }
  }, 20000);

  it("detects name match for Polish VAT", async () => {
    const result = await validateVatNumber("PL7740001454", "ORLEN");
    if (result.valid && result.registeredName && result.registeredName !== "---") {
      expect(result.nameMatchesDocument).toBe(true);
    }
  }, 20000);

  it("detects name mismatch for Polish VAT", async () => {
    const result = await validateVatNumber("PL7740001454", "Fake Transport GmbH");
    if (result.valid && result.registeredName && result.registeredName !== "---") {
      expect(result.nameMatchesDocument).toBe(false);
    }
  }, 20000);

  it("returns null for name match when country returns --- (DE)", async () => {
    const result = await validateVatNumber("DE124906368", "Mannheimer Versicherung");
    if (result.valid) {
      // Germany returns "---" for name
      expect(result.nameMatchesDocument).toBeNull();
    }
  }, 20000);
});

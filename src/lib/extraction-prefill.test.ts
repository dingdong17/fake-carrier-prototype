import { describe, it, expect } from "vitest";
import { extractCarrierPrefill } from "./extraction-prefill";

describe("extractCarrierPrefill", () => {
  it("returns empty object when no fields match", () => {
    expect(extractCarrierPrefill("unknown", {})).toEqual({});
  });

  it("maps insuredCompany to carrierName", () => {
    expect(
      extractCarrierPrefill("insurance-cert", { insuredCompany: "ACME GmbH" })
    ).toEqual({ carrierName: "ACME GmbH" });
  });

  it("maps companyName to carrierName", () => {
    expect(
      extractCarrierPrefill("letterhead", { companyName: "Transport AG" })
    ).toEqual({ carrierName: "Transport AG" });
  });

  it("maps vatIdCarrier to carrierVatId", () => {
    expect(
      extractCarrierPrefill("insurance-cert", { vatIdCarrier: "DE123456789" })
    ).toEqual({ carrierVatId: "DE123456789" });
  });

  it("maps vatId to carrierVatId when vatIdCarrier is missing", () => {
    expect(
      extractCarrierPrefill("letterhead", { vatId: "DE987654321" })
    ).toEqual({ carrierVatId: "DE987654321" });
  });

  it("maps insurer and policyNumber", () => {
    expect(
      extractCarrierPrefill("insurance-cert", {
        insurer: "Allianz",
        policyNumber: "VKH-2024-1",
      })
    ).toEqual({ insurer: "Allianz", policyNumber: "VKH-2024-1" });
  });

  it("maps coveragePeriod to coverageStart/coverageEnd for insurance-cert", () => {
    expect(
      extractCarrierPrefill("insurance-cert", {
        coveragePeriod: { start: "01.01.2026", end: "31.12.2026" },
      })
    ).toEqual({ coverageStart: "01.01.2026", coverageEnd: "31.12.2026" });
  });

  it("formats coverageAmount into sumInsured for insurance-cert", () => {
    expect(
      extractCarrierPrefill("insurance-cert", {
        coverageAmount: { amount: 1000000, currency: "EUR" },
      })
    ).toEqual({ sumInsured: "1.000.000 EUR" });
  });

  it("uses coverageAmount description when present", () => {
    expect(
      extractCarrierPrefill("insurance-cert", {
        coverageAmount: {
          amount: 1000000,
          currency: "EUR",
          description: "1,2 Mio. EUR pro Schaden",
        },
      })
    ).toEqual({ sumInsured: "1,2 Mio. EUR pro Schaden" });
  });

  it("joins coInsuredCompanies with newlines into coInsured", () => {
    expect(
      extractCarrierPrefill("insurance-cert", {
        coInsuredCompanies: ["A GmbH", "B GmbH"],
      })
    ).toEqual({ coInsured: "A GmbH\nB GmbH" });
  });

  it("extracts email from senderEmail", () => {
    expect(
      extractCarrierPrefill("communication", { senderEmail: "info@acme.de" })
    ).toEqual({ carrierEmail: "info@acme.de" });
  });

  it("extracts email from contactInfo.email when senderEmail absent", () => {
    expect(
      extractCarrierPrefill("letterhead", {
        contactInfo: { email: "kontakt@acme.de" },
      })
    ).toEqual({ carrierEmail: "kontakt@acme.de" });
  });

  it("extracts website field", () => {
    expect(
      extractCarrierPrefill("letterhead", { website: "www.acme.de" })
    ).toEqual({ carrierWebsite: "www.acme.de" });
  });

  it("skips null/undefined/empty values", () => {
    expect(
      extractCarrierPrefill("insurance-cert", {
        insuredCompany: null,
        insurer: "",
        policyNumber: undefined,
        vatIdCarrier: "DE1",
      })
    ).toEqual({ carrierVatId: "DE1" });
  });

  it("ignores coveragePeriod outside insurance-cert", () => {
    expect(
      extractCarrierPrefill("letterhead", {
        coveragePeriod: { start: "01.01.2026", end: "31.12.2026" },
      })
    ).toEqual({});
  });

  it("combines multiple mappings in one call", () => {
    expect(
      extractCarrierPrefill("insurance-cert", {
        insuredCompany: "ACME",
        vatIdCarrier: "DE1",
        insurer: "Allianz",
        coveragePeriod: { start: "01.01.2026" },
      })
    ).toEqual({
      carrierName: "ACME",
      carrierVatId: "DE1",
      insurer: "Allianz",
      coverageStart: "01.01.2026",
    });
  });
});

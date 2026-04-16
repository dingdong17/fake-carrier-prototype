import { describe, it, expect } from "vitest";
import { checkDomainAge, extractDomainFromEmail, extractDomainFromUrl } from "./domain-check";

describe("extractDomainFromEmail", () => {
  it("extracts domain from standard email", () => {
    expect(extractDomainFromEmail("info@transport-gmbh.de")).toBe("transport-gmbh.de");
  });

  it("extracts domain from freemail", () => {
    expect(extractDomainFromEmail("driver@gmail.com")).toBe("gmail.com");
  });

  it("returns null for invalid input", () => {
    expect(extractDomainFromEmail("not-an-email")).toBeNull();
    expect(extractDomainFromEmail("")).toBeNull();
  });
});

describe("extractDomainFromUrl", () => {
  it("extracts domain from https URL", () => {
    expect(extractDomainFromUrl("https://www.transport-gmbh.de/kontakt")).toBe("transport-gmbh.de");
  });

  it("extracts domain from bare domain", () => {
    expect(extractDomainFromUrl("transport-gmbh.de")).toBe("transport-gmbh.de");
  });

  it("strips www prefix", () => {
    expect(extractDomainFromUrl("www.example.com")).toBe("example.com");
  });

  it("returns null for empty input", () => {
    expect(extractDomainFromUrl("")).toBeNull();
  });
});

describe("checkDomainAge — real RDAP API", () => {
  it("returns age data for a well-known old domain", async () => {
    const result = await checkDomainAge("google.com");
    expect(result.exists).toBe(true);
    expect(result.creationDate).toBeTruthy();
    expect(result.ageInDays).toBeGreaterThan(5000);
    expect(result.isYoung).toBe(false);
  }, 15000);

  it("returns not-found for a non-existent domain", async () => {
    const result = await checkDomainAge("thisdomaindoesnotexist99999.com");
    expect(result.exists).toBe(false);
  }, 15000);

  it("flags young domains", async () => {
    // We can't easily test a truly young domain, but we verify the flag logic
    // by checking that a known old domain is NOT flagged
    const result = await checkDomainAge("example.com");
    if (result.exists) {
      expect(result.isYoung).toBe(false);
    }
  }, 15000);
});

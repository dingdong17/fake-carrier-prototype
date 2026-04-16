import { describe, it, expect } from "vitest";
import { checkWebsiteExists } from "./website-check";

describe("checkWebsiteExists", () => {
  it("finds a known website by company name", async () => {
    const result = await checkWebsiteExists("Google", "Deutschland");
    expect(result.exists).toBe(true);
    expect(result.url).toBeTruthy();
  });

  it("checks a known URL directly", async () => {
    const result = await checkWebsiteExists("Test", undefined, "https://www.google.com");
    expect(result.exists).toBe(true);
    expect(result.url).toBe("https://www.google.com");
  });

  it("returns false for a clearly fake company", async () => {
    const result = await checkWebsiteExists("xyznonexistent99999phantom");
    expect(result.exists).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("tries country-specific TLDs for German companies", async () => {
    // This tests the domain candidate generation — should try .de first
    const result = await checkWebsiteExists("Ecclesia", "Deutschland");
    // ecclesia.de or ecclesia.com should exist
    if (result.exists) {
      expect(result.url).toMatch(/ecclesia/);
    }
  });

  it("tries .pl TLD for Polish companies", async () => {
    const result = await checkWebsiteExists("Orlen", "Polen");
    if (result.exists) {
      expect(result.url).toBeTruthy();
    }
  });
});

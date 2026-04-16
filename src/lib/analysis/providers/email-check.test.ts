import { describe, it, expect } from "vitest";
import { checkEmail, FREEMAIL_DOMAINS } from "./email-check";

describe("FREEMAIL_DOMAINS", () => {
  it("contains common freemail providers", () => {
    expect(FREEMAIL_DOMAINS).toContain("gmail.com");
    expect(FREEMAIL_DOMAINS).toContain("gmx.de");
    expect(FREEMAIL_DOMAINS).toContain("hotmail.com");
    expect(FREEMAIL_DOMAINS).toContain("web.de");
    expect(FREEMAIL_DOMAINS).toContain("outlook.com");
  });
});

describe("checkEmail", () => {
  it("detects freemail addresses", async () => {
    const result = await checkEmail("driver@gmail.com");
    expect(result.isFreemail).toBe(true);
    expect(result.freemailProvider).toBe("gmail.com");
  });

  it("does not flag business email as freemail", async () => {
    const result = await checkEmail("info@dhl.com");
    expect(result.isFreemail).toBe(false);
  });

  it("checks domain existence via DNS", async () => {
    const result = await checkEmail("info@google.com");
    expect(result.domainExists).toBe(true);
  }, 10000);

  it("detects non-existent domain", async () => {
    const result = await checkEmail("fake@thisdomaindoesnotexist99999.com");
    expect(result.domainExists).toBe(false);
  }, 10000);

  it("checks if email domain matches company name", async () => {
    const result = await checkEmail("info@transport-mueller.de", "Transport Mueller GmbH");
    expect(result.domainMatchesCompany).toBe(true);
  });

  it("flags mismatch between email domain and company name", async () => {
    const result = await checkEmail("info@random-domain.de", "VE-Log GmbH");
    expect(result.domainMatchesCompany).toBe(false);
  });

  it("returns null for company match when no company provided", async () => {
    const result = await checkEmail("info@example.com");
    expect(result.domainMatchesCompany).toBeNull();
  });
});

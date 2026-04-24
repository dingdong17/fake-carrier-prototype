import { describe, it, expect } from "vitest";
import { emailDomain } from "./provision";

describe("emailDomain", () => {
  it("extracts the domain portion lowercased", () => {
    expect(emailDomain("m.Keller@Musterfirma.DE")).toBe("musterfirma.de");
  });
  it("handles subdomains", () => {
    expect(emailDomain("a@b.example.com")).toBe("b.example.com");
  });
  it("returns empty for malformed input", () => {
    expect(emailDomain("nope")).toBe("");
    expect(emailDomain("")).toBe("");
  });
});

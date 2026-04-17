import { describe, it, expect } from "vitest";
import { generateId, formatCheckNumber, formatBacklogNumber, formatEpicNumber, formatDate } from "./utils";

describe("generateId", () => {
  it("returns a valid UUID v4 string", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("formatCheckNumber", () => {
  it("pads single digit", () => {
    expect(formatCheckNumber(1)).toBe("FC-001");
  });

  it("pads double digit", () => {
    expect(formatCheckNumber(42)).toBe("FC-042");
  });

  it("handles triple digit", () => {
    expect(formatCheckNumber(999)).toBe("FC-999");
  });

  it("handles four digits without truncating", () => {
    expect(formatCheckNumber(1234)).toBe("FC-1234");
  });

  it("handles zero", () => {
    expect(formatCheckNumber(0)).toBe("FC-000");
  });
});

describe("formatBacklogNumber", () => {
  it("pads single digit", () => {
    expect(formatBacklogNumber(1)).toBe("BL-001");
  });

  it("pads double digit", () => {
    expect(formatBacklogNumber(15)).toBe("BL-015");
  });

  it("handles four digits", () => {
    expect(formatBacklogNumber(1000)).toBe("BL-1000");
  });
});

describe("formatEpicNumber", () => {
  it("pads single digit", () => {
    expect(formatEpicNumber(1)).toBe("EPIC-001");
  });

  it("pads double digit", () => {
    expect(formatEpicNumber(15)).toBe("EPIC-015");
  });

  it("handles four digits", () => {
    expect(formatEpicNumber(1000)).toBe("EPIC-1000");
  });
});

describe("formatDate", () => {
  it("formats a date in German locale", () => {
    const date = new Date("2026-04-15T14:30:00Z");
    const result = formatDate(date);
    // Should contain day, month, year in German format
    expect(result).toContain("2026");
    expect(result).toContain("04");
    expect(result).toContain("15");
  });
});

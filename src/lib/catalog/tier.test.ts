import { describe, it, expect } from "vitest";
import { isInTier, TIER_LABELS } from "./tier";

describe("isInTier", () => {
  it("quick tier runs only quick checks", () => {
    expect(isInTier("quick", "quick")).toBe(true);
    expect(isInTier("quick", "medium")).toBe(false);
    expect(isInTier("quick", "full")).toBe(false);
  });

  it("medium tier runs quick and medium checks", () => {
    expect(isInTier("medium", "quick")).toBe(true);
    expect(isInTier("medium", "medium")).toBe(true);
    expect(isInTier("medium", "full")).toBe(false);
  });

  it("full tier runs everything", () => {
    expect(isInTier("full", "quick")).toBe(true);
    expect(isInTier("full", "medium")).toBe(true);
    expect(isInTier("full", "full")).toBe(true);
  });
});

describe("TIER_LABELS", () => {
  it("has a German label for every tier", () => {
    expect(TIER_LABELS.quick).toBeTruthy();
    expect(TIER_LABELS.medium).toBeTruthy();
    expect(TIER_LABELS.full).toBeTruthy();
  });
});

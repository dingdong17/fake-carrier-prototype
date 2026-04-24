import { describe, it, expect } from "vitest";
import { t, tList } from "./index";

describe("t()", () => {
  it("returns a plain string by key path", () => {
    expect(t("landing.header.ctas.login")).toBe("Einloggen");
  });

  it("interpolates {var} placeholders", () => {
    expect(t("landing.hero.lead", { appName: "X" })).toMatch(/^X prüft/);
  });

  it("leaves unknown placeholders intact", () => {
    const s = t("landing.hero.lead");
    expect(s).toContain("{appName}");
  });

  it("returns the key itself on a missing path (fail-loud in dev)", () => {
    // @ts-expect-error intentionally invalid key
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});

describe("tList()", () => {
  it("returns the array at a path", () => {
    const items = tList<{ q: string; a: string }>("landing.faq.items");
    expect(items).toHaveLength(6);
    expect(items[0].q).toMatch(/{appName}/);
  });

  it("returns [] for a non-array path", () => {
    expect(tList("landing.hero.h1Accent")).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";

describe("analytics module", () => {
  it("exports logEvent as an async function", async () => {
    const mod = await import("./analytics");
    expect(typeof mod.logEvent).toBe("function");
    const p = mod.logEvent("test.smoke", { meta: { ok: true } });
    await expect(p).resolves.toBeUndefined();
  });
});

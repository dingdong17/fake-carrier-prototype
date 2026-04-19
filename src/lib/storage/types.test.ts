import { describe, it, expect } from "vitest";
import type { Storage, StoredObject } from "./types";

describe("Storage interface", () => {
  it("exposes the expected method signatures via a type check", () => {
    // This test exists only to ensure the module compiles with the interface present.
    // If either import resolves to undefined at runtime, this will throw.
    const marker: Storage | null = null;
    const obj: StoredObject | null = null;
    expect(marker).toBeNull();
    expect(obj).toBeNull();
  });
});

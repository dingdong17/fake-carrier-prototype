import { describe, it, expect } from "vitest";
import { sortByPriority } from "./sort";

type Item = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  createdAt: string;
};

const mk = (id: string, priority: Item["priority"], createdAt: string): Item => ({
  id,
  priority,
  createdAt,
});

describe("sortByPriority", () => {
  it("orders by priority rank: critical > high > medium > low", () => {
    const input = [
      mk("a", "low", "2026-01-01T00:00:00Z"),
      mk("b", "high", "2026-01-01T00:00:00Z"),
      mk("c", "critical", "2026-01-01T00:00:00Z"),
      mk("d", "medium", "2026-01-01T00:00:00Z"),
    ];
    expect(sortByPriority(input).map((x) => x.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("breaks ties by createdAt descending (newer first)", () => {
    const input = [
      mk("older", "high", "2026-01-01T00:00:00Z"),
      mk("newer", "high", "2026-03-01T00:00:00Z"),
    ];
    expect(sortByPriority(input).map((x) => x.id)).toEqual(["newer", "older"]);
  });

  it("returns an empty array for empty input", () => {
    expect(sortByPriority([])).toEqual([]);
  });

  it("returns a single-item array unchanged", () => {
    const input = [mk("solo", "medium", "2026-01-01T00:00:00Z")];
    expect(sortByPriority(input)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input = [
      mk("a", "low", "2026-01-01T00:00:00Z"),
      mk("b", "critical", "2026-01-01T00:00:00Z"),
    ];
    const snapshot = input.map((x) => x.id).join(",");
    sortByPriority(input);
    expect(input.map((x) => x.id).join(",")).toBe(snapshot);
  });
});

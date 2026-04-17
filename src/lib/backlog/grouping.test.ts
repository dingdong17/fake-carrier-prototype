import { describe, it, expect } from "vitest";
import { buildEpicRows, PRIORITY_ORDER } from "./grouping";

type Item = {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  sortOrder: number;
  epicId: string;
};

type Epic = {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  sortOrder: number;
  isProtected: number;
};

function e(overrides: Partial<Epic> = {}): Epic {
  return {
    id: overrides.id ?? "e1",
    itemNumber: overrides.itemNumber ?? "EPIC-002",
    title: overrides.title ?? "Alpha",
    description: null,
    priority: overrides.priority ?? "medium",
    status: "backlog",
    sortOrder: overrides.sortOrder ?? 0,
    isProtected: overrides.isProtected ?? 0,
    ...overrides,
  };
}

function i(overrides: Partial<Item> = {}): Item {
  return {
    id: overrides.id ?? "i1",
    itemNumber: overrides.itemNumber ?? "BL-001",
    title: overrides.title ?? "Item",
    description: null,
    priority: overrides.priority ?? "medium",
    status: overrides.status ?? "backlog",
    sortOrder: overrides.sortOrder ?? 0,
    epicId: overrides.epicId ?? "e1",
    ...overrides,
  };
}

describe("PRIORITY_ORDER", () => {
  it("orders critical < high < medium < low", () => {
    expect(PRIORITY_ORDER.critical).toBeLessThan(PRIORITY_ORDER.high);
    expect(PRIORITY_ORDER.high).toBeLessThan(PRIORITY_ORDER.medium);
    expect(PRIORITY_ORDER.medium).toBeLessThan(PRIORITY_ORDER.low);
  });
});

describe("buildEpicRows", () => {
  it("produces one row per epic with items split into the three cells", () => {
    const epic = e();
    const items = [
      i({ id: "a", status: "backlog" }),
      i({ id: "b", status: "in_progress" }),
      i({ id: "c", status: "done" }),
    ];
    const rows = buildEpicRows({ epics: [epic], items, priorityFilter: "all" });
    expect(rows).toHaveLength(1);
    expect(rows[0].cells.backlog.map((x) => x.id)).toEqual(["a"]);
    expect(rows[0].cells.in_progress.map((x) => x.id)).toEqual(["b"]);
    expect(rows[0].cells.done.map((x) => x.id)).toEqual(["c"]);
    expect(rows[0].total).toBe(3);
    expect(rows[0].counts).toEqual({ backlog: 1, in_progress: 1, done: 1 });
  });

  it("applies priority filter to items", () => {
    const epic = e();
    const items = [
      i({ id: "a", priority: "high" }),
      i({ id: "b", priority: "low" }),
    ];
    const rows = buildEpicRows({ epics: [epic], items, priorityFilter: "high" });
    expect(rows[0].cells.backlog.map((x) => x.id)).toEqual(["a"]);
    expect(rows[0].total).toBe(1);
  });

  it("hides Orphans when it has no items after filtering", () => {
    const orphans = e({ id: "orph", itemNumber: "EPIC-001", title: "Orphans", isProtected: 1 });
    const alpha = e({ id: "a", itemNumber: "EPIC-002", title: "Alpha" });
    const items = [i({ id: "one", epicId: "a" })];
    const rows = buildEpicRows({ epics: [orphans, alpha], items, priorityFilter: "all" });
    expect(rows.map((r) => r.epic.id)).toEqual(["a"]);
  });

  it("keeps Orphans when it has items, and forces it to the bottom", () => {
    const orphans = e({ id: "orph", itemNumber: "EPIC-001", title: "Orphans", isProtected: 1, priority: "critical" });
    const alpha = e({ id: "a", itemNumber: "EPIC-002", title: "Alpha", priority: "low" });
    const items = [i({ id: "one", epicId: "orph" }), i({ id: "two", epicId: "a" })];
    const rows = buildEpicRows({ epics: [orphans, alpha], items, priorityFilter: "all" });
    expect(rows.map((r) => r.epic.id)).toEqual(["a", "orph"]);
  });

  it("sorts non-Orphan epics by priority then sortOrder", () => {
    const epics = [
      e({ id: "low1", priority: "low", sortOrder: 1 }),
      e({ id: "med1", priority: "medium", sortOrder: 2 }),
      e({ id: "crit1", priority: "critical", sortOrder: 3 }),
      e({ id: "med2", priority: "medium", sortOrder: 0 }),
    ];
    const rows = buildEpicRows({ epics, items: [i({ epicId: "low1" }), i({ epicId: "med1" }), i({ epicId: "crit1" }), i({ epicId: "med2" })], priorityFilter: "all" });
    expect(rows.map((r) => r.epic.id)).toEqual(["crit1", "med2", "med1", "low1"]);
  });

  it("handles items pointing at a missing epic by skipping them", () => {
    const rows = buildEpicRows({ epics: [e()], items: [i({ epicId: "ghost" })], priorityFilter: "all" });
    expect(rows[0].total).toBe(0);
  });
});

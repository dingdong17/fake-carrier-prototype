import { describe, it, expect } from "vitest";
import { makeTestDb } from "./test-db";
import { backlogItems } from "./schema";
import {
  createEpic,
  updateEpic,
  deleteEpic,
  listEpicsWithProgress,
  ensureOrphansEpic,
  nextEpicNumber,
  createItem,
  updateItem,
} from "./epics";

describe("ensureOrphansEpic", () => {
  it("creates Orphans epic on first call", () => {
    const db = makeTestDb();
    const orphans = ensureOrphansEpic(db);
    expect(orphans.itemNumber).toBe("EPIC-001");
    expect(orphans.title).toBe("Orphans");
    expect(orphans.isProtected).toBe(1);
  });

  it("is idempotent", () => {
    const db = makeTestDb();
    const a = ensureOrphansEpic(db);
    const b = ensureOrphansEpic(db);
    expect(a.id).toBe(b.id);
    expect(listEpicsWithProgress(db)).toHaveLength(1);
  });
});

describe("nextEpicNumber", () => {
  it("returns EPIC-001 for empty table", () => {
    const db = makeTestDb();
    expect(nextEpicNumber(db)).toBe("EPIC-001");
  });

  it("increments past the highest existing number", () => {
    const db = makeTestDb();
    ensureOrphansEpic(db); // EPIC-001
    createEpic(db, { title: "Alpha", priority: "medium" }); // EPIC-002
    expect(nextEpicNumber(db)).toBe("EPIC-003");
  });
});

describe("createEpic", () => {
  it("assigns a sequential EPIC number and defaults status to backlog", () => {
    const db = makeTestDb();
    ensureOrphansEpic(db);
    const epic = createEpic(db, { title: "AI fraud detection", priority: "high" });
    expect(epic.itemNumber).toBe("EPIC-002");
    expect(epic.status).toBe("backlog");
    expect(epic.isProtected).toBe(0);
  });
});

describe("updateEpic", () => {
  it("updates fields on a normal epic", () => {
    const db = makeTestDb();
    ensureOrphansEpic(db);
    const epic = createEpic(db, { title: "Alpha", priority: "low" });
    updateEpic(db, { id: epic.id, status: "in_progress", priority: "high" });
    const list = listEpicsWithProgress(db);
    const updated = list.find((e) => e.id === epic.id)!;
    expect(updated.status).toBe("in_progress");
    expect(updated.priority).toBe("high");
  });

  it("throws on protected epic", () => {
    const db = makeTestDb();
    const orphans = ensureOrphansEpic(db);
    expect(() => updateEpic(db, { id: orphans.id, title: "Nope" })).toThrow(
      "Dieses Epic kann nicht bearbeitet werden"
    );
  });
});

describe("deleteEpic", () => {
  it("reassigns items to Orphans and removes the epic", () => {
    const db = makeTestDb();
    const orphans = ensureOrphansEpic(db);
    const epic = createEpic(db, { title: "Temp", priority: "low" });
    const item = createItem(db, {
      title: "Something",
      priority: "medium",
      epicId: epic.id,
    });

    deleteEpic(db, epic.id);

    const epics = listEpicsWithProgress(db);
    expect(epics.map((e) => e.id)).toEqual([orphans.id]);
    // Item still exists, now belongs to Orphans:
    expect(listEpicsWithProgress(db)[0].progress.total).toBe(1);
    expect(listEpicsWithProgress(db)[0].progress.done).toBe(0);
    // And its epicId points at Orphans:
    const row = db
      .select()
      .from(backlogItems)
      .all()
      .find((i) => i.id === item.id)!;
    expect(row.epicId).toBe(orphans.id);
  });

  it("throws on protected epic", () => {
    const db = makeTestDb();
    const orphans = ensureOrphansEpic(db);
    expect(() => deleteEpic(db, orphans.id)).toThrow(
      "Dieses Epic kann nicht gelöscht werden"
    );
  });
});

describe("listEpicsWithProgress", () => {
  it("includes total/done/inProgress counts per epic", () => {
    const db = makeTestDb();
    const orphans = ensureOrphansEpic(db);
    const epic = createEpic(db, { title: "Alpha", priority: "medium" });

    createItem(db, { title: "a", priority: "medium", epicId: epic.id });
    const b = createItem(db, { title: "b", priority: "medium", epicId: epic.id });
    const c = createItem(db, { title: "c", priority: "medium", epicId: epic.id });
    updateItem(db, { id: b.id, status: "in_progress" });
    updateItem(db, { id: c.id, status: "done" });

    const list = listEpicsWithProgress(db);
    const alpha = list.find((e) => e.id === epic.id)!;
    expect(alpha.progress).toEqual({ total: 3, done: 1, inProgress: 1 });

    const orph = list.find((e) => e.id === orphans.id)!;
    expect(orph.progress).toEqual({ total: 0, done: 0, inProgress: 0 });
  });
});

describe("createItem", () => {
  it("rejects missing epic", () => {
    const db = makeTestDb();
    ensureOrphansEpic(db);
    expect(() =>
      createItem(db, {
        title: "Orphan test",
        priority: "medium",
        epicId: "does-not-exist",
      })
    ).toThrow("Epic nicht gefunden");
  });

  it("generates a contiguous BL number", () => {
    const db = makeTestDb();
    const orphans = ensureOrphansEpic(db);
    const a = createItem(db, { title: "a", priority: "low", epicId: orphans.id });
    const b = createItem(db, { title: "b", priority: "low", epicId: orphans.id });
    expect(a.itemNumber).toBe("BL-001");
    expect(b.itemNumber).toBe("BL-002");
  });
});

describe("updateItem", () => {
  it("rejects reassignment to unknown epic", () => {
    const db = makeTestDb();
    const orphans = ensureOrphansEpic(db);
    const item = createItem(db, { title: "a", priority: "low", epicId: orphans.id });
    expect(() => updateItem(db, { id: item.id, epicId: "nope" })).toThrow(
      "Epic nicht gefunden"
    );
  });
});

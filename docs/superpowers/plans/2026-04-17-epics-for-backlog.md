# Epics for Backlog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Epics as required parents of backlog items: new `epics` table, `/backlog/epics` overview, epic filter + chip on the Kanban, and item-level epic reassignment via a new edit modal.

**Architecture:** A new `epics` SQLite table (parallel to `backlog_items`) is introduced with a `NOT NULL` `epic_id` column added to `backlog_items`. A protected "Orphans" epic (`EPIC-001`) serves as the fallback parent. CRUD logic lives in a new pure service module (`src/lib/db/epics.ts`) that takes a drizzle instance — testable against in-memory sqlite and reused by both `/api/epics` and `/api/backlog` routes.

**Tech Stack:** Next.js 15 (App Router), React client components, better-sqlite3 + drizzle-orm, vitest for tests, Tailwind. German-language UI strings.

**Design spec:** `docs/superpowers/specs/2026-04-17-epics-for-backlog-design.md`.

---

## File Structure

### Created
- `src/lib/db/epics.ts` — pure service functions (create/update/delete epics, assign items, compute progress). Takes `db` as argument.
- `src/lib/db/epics.test.ts` — integration tests for the service module against in-memory sqlite.
- `src/lib/db/test-db.ts` — helper that builds an in-memory drizzle db with the current schema. Used only by tests.
- `src/app/api/epics/route.ts` — GET (list + progress) and POST (create/update/delete actions).
- `src/app/backlog/epics/page.tsx` — client overview page.
- `src/components/backlog/epic-card.tsx` — card used on the overview.
- `src/components/backlog/add-epic-form.tsx` — inline create form.
- `src/components/backlog/edit-item-modal.tsx` — edit item title/description/priority/epic.
- `src/components/backlog/epic-filter.tsx` — shared epic dropdown.

### Modified
- `src/lib/utils.ts` — add `formatEpicNumber`.
- `src/lib/utils.test.ts` — unit tests for `formatEpicNumber`.
- `src/lib/db/schema.ts` — add `epics` table; add `epicId` column to `backlogItems`; export `Epic`, `NewEpic` types.
- `src/lib/db/seed.ts` — create `epics` table, ensure Orphans, backfill, seed remaining 7 epics + re-assign items.
- `src/app/api/backlog/route.ts` — require `epicId` on create; accept `epicId` on update.
- `src/app/backlog/page.tsx` — epic filter, modal open on card click, chip data on cards, `?epic=` URL param.
- `src/components/backlog/add-item-form.tsx` — required Epic select above priority.
- `src/components/backlog/kanban-card.tsx` — optional `epic` prop and muted chip line.
- `src/components/layout/nav-links.tsx` — add "Epics" link (or treat `/backlog/epics` as reachable under `/backlog` active link — see Task 10).

---

## Task 1: Add `formatEpicNumber` helper

**Files:**
- Modify: `src/lib/utils.ts`
- Test: `src/lib/utils.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside `src/lib/utils.test.ts`:

```ts
import { generateId, formatCheckNumber, formatBacklogNumber, formatEpicNumber, formatDate } from "./utils";

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
```

(Add `formatEpicNumber` to the existing top-level import line; don't duplicate it.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: FAIL — `formatEpicNumber` is not exported from `./utils`.

- [ ] **Step 3: Implement**

Append to `src/lib/utils.ts`:

```ts
export function formatEpicNumber(seq: number): string {
  return `EPIC-${String(seq).padStart(3, "0")}`;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat(backlog): add formatEpicNumber helper"
```

---

## Task 2: Schema — add `epics` table and `epicId` on items

**Files:**
- Modify: `src/lib/db/schema.ts`

No runtime test here (schema is just type/definition). Tests in Task 3 will exercise it.

- [ ] **Step 1: Add the `epics` table and `epicId` column**

Replace the `backlogItems` table definition in `src/lib/db/schema.ts` and add the new `epics` table ABOVE `backlogItems` (so `backlogItems` can reference it). The final file shape:

```ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const checks = sqliteTable("checks", {
  // ... unchanged
});

export const documents = sqliteTable("documents", {
  // ... unchanged
});

export const chatMessages = sqliteTable("chat_messages", {
  // ... unchanged
});

export const epics = sqliteTable("epics", {
  id: text("id").primaryKey(),
  itemNumber: text("item_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", {
    enum: ["critical", "high", "medium", "low"],
  }).notNull(),
  status: text("status", {
    enum: ["backlog", "in_progress", "done"],
  })
    .notNull()
    .default("backlog"),
  sortOrder: integer("sort_order").notNull().default(0),
  isProtected: integer("is_protected").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const backlogItems = sqliteTable("backlog_items", {
  id: text("id").primaryKey(),
  itemNumber: text("item_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", {
    enum: ["critical", "high", "medium", "low"],
  }).notNull(),
  status: text("status", {
    enum: ["backlog", "in_progress", "done"],
  })
    .notNull()
    .default("backlog"),
  sortOrder: integer("sort_order").notNull().default(0),
  epicId: text("epic_id")
    .notNull()
    .references(() => epics.id),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const feedback = sqliteTable("feedback", {
  // ... unchanged
});

export type Check = typeof checks.$inferSelect;
export type NewCheck = typeof checks.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Epic = typeof epics.$inferSelect;
export type NewEpic = typeof epics.$inferInsert;
export type BacklogItem = typeof backlogItems.$inferSelect;
export type NewBacklogItem = typeof backlogItems.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
```

Keep the existing `checks`, `documents`, `chatMessages`, `feedback` definitions byte-for-byte — only the positions and the two changed blocks matter.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (If the rest of the codebase has unrelated type errors, note them but do not fix here.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(backlog): add epics table and epic_id on backlog_items"
```

---

## Task 3: DB service module — `src/lib/db/epics.ts` with integration tests

Purpose: Centralize all epic-related DB logic so both API routes and tests share the same code paths. All functions take a `BetterSQLite3Database` (the drizzle instance) so tests can pass in-memory and prod passes the shared `db`.

**Files:**
- Create: `src/lib/db/test-db.ts`
- Create: `src/lib/db/epics.ts`
- Create: `src/lib/db/epics.test.ts`

- [ ] **Step 1: Create the test-db helper**

Create `src/lib/db/test-db.ts`:

```ts
import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export function makeTestDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE epics (
      id TEXT PRIMARY KEY,
      item_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_protected INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE backlog_items (
      id TEXT PRIMARY KEY,
      item_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      sort_order INTEGER NOT NULL DEFAULT 0,
      epic_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return drizzle(sqlite, { schema });
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/db/epics.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/db/epics.test.ts`
Expected: FAIL — `./epics` cannot be imported (module does not exist yet).

- [ ] **Step 4: Implement `src/lib/db/epics.ts`**

Create `src/lib/db/epics.ts`:

```ts
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq, sql, asc } from "drizzle-orm";
import * as schema from "./schema";
import { epics, backlogItems, Epic } from "./schema";
import { generateId, formatEpicNumber, formatBacklogNumber } from "../utils";

type DB = BetterSQLite3Database<typeof schema>;
type Priority = "critical" | "high" | "medium" | "low";
type Status = "backlog" | "in_progress" | "done";

export interface EpicWithProgress extends Epic {
  progress: { total: number; done: number; inProgress: number };
}

export function nextEpicNumber(db: DB): string {
  const row = db
    .select({ maxNum: sql<string>`max(item_number)` })
    .from(epics)
    .get();
  const last = row?.maxNum ? parseInt(row.maxNum.replace("EPIC-", ""), 10) : 0;
  const seq = (Number.isNaN(last) ? 0 : last) + 1;
  return formatEpicNumber(seq);
}

function nextBacklogNumber(db: DB): string {
  const row = db
    .select({ maxNum: sql<string>`max(item_number)` })
    .from(backlogItems)
    .get();
  const last = row?.maxNum ? parseInt(row.maxNum.replace("BL-", ""), 10) : 0;
  const seq = (Number.isNaN(last) ? 0 : last) + 1;
  return formatBacklogNumber(seq);
}

export function ensureOrphansEpic(db: DB): Epic {
  const existing = db
    .select()
    .from(epics)
    .where(eq(epics.itemNumber, "EPIC-001"))
    .get();
  if (existing) return existing;

  const now = new Date().toISOString();
  const epic = {
    id: generateId(),
    itemNumber: "EPIC-001",
    title: "Orphans",
    description: "Fallback epic for items without an explicit parent.",
    priority: "low" as Priority,
    status: "backlog" as Status,
    sortOrder: 0,
    isProtected: 1,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(epics).values(epic).run();
  return epic as Epic;
}

export interface CreateEpicInput {
  title: string;
  description?: string | null;
  priority: Priority;
}

export function createEpic(db: DB, input: CreateEpicInput): Epic {
  const now = new Date().toISOString();
  const existingCount = db
    .select({ c: sql<number>`count(*)` })
    .from(epics)
    .get();
  const sortOrder = existingCount?.c ?? 0;

  const epic = {
    id: generateId(),
    itemNumber: nextEpicNumber(db),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priority: input.priority,
    status: "backlog" as Status,
    sortOrder,
    isProtected: 0,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(epics).values(epic).run();
  return epic as Epic;
}

export interface UpdateEpicInput {
  id: string;
  title?: string;
  description?: string | null;
  priority?: Priority;
  status?: Status;
  sortOrder?: number;
}

export function updateEpic(db: DB, input: UpdateEpicInput): void {
  const existing = db.select().from(epics).where(eq(epics.id, input.id)).get();
  if (!existing) throw new Error("Epic nicht gefunden");
  if (existing.isProtected === 1) {
    throw new Error("Dieses Epic kann nicht bearbeitet werden");
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.status !== undefined) updates.status = input.status;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  db.update(epics).set(updates).where(eq(epics.id, input.id)).run();
}

export function deleteEpic(db: DB, id: string): void {
  const existing = db.select().from(epics).where(eq(epics.id, id)).get();
  if (!existing) throw new Error("Epic nicht gefunden");
  if (existing.isProtected === 1) {
    throw new Error("Dieses Epic kann nicht gelöscht werden");
  }

  const orphans = ensureOrphansEpic(db);

  // better-sqlite3 transactions are synchronous:
  const tx = (db as unknown as { $client: { transaction: (fn: () => void) => () => void } }).$client.transaction(
    () => {
      db.update(backlogItems)
        .set({ epicId: orphans.id, updatedAt: new Date().toISOString() })
        .where(eq(backlogItems.epicId, id))
        .run();
      db.delete(epics).where(eq(epics.id, id)).run();
    }
  );
  tx();
}

export function listEpicsWithProgress(db: DB): EpicWithProgress[] {
  const allEpics = db.select().from(epics).orderBy(asc(epics.sortOrder)).all();
  const counts = db
    .select({
      epicId: backlogItems.epicId,
      status: backlogItems.status,
      c: sql<number>`count(*)`,
    })
    .from(backlogItems)
    .groupBy(backlogItems.epicId, backlogItems.status)
    .all();

  return allEpics.map((e) => {
    const own = counts.filter((c) => c.epicId === e.id);
    const total = own.reduce((sum, c) => sum + Number(c.c), 0);
    const done = own
      .filter((c) => c.status === "done")
      .reduce((sum, c) => sum + Number(c.c), 0);
    const inProgress = own
      .filter((c) => c.status === "in_progress")
      .reduce((sum, c) => sum + Number(c.c), 0);
    return { ...e, progress: { total, done, inProgress } };
  });
}

export interface CreateItemInput {
  title: string;
  description?: string | null;
  priority: Priority;
  epicId: string;
}

export function createItem(db: DB, input: CreateItemInput) {
  const epic = db.select().from(epics).where(eq(epics.id, input.epicId)).get();
  if (!epic) throw new Error("Epic nicht gefunden");

  const now = new Date().toISOString();
  const existingCount = db
    .select({ c: sql<number>`count(*)` })
    .from(backlogItems)
    .get();
  const sortOrder = existingCount?.c ?? 0;

  const item = {
    id: generateId(),
    itemNumber: nextBacklogNumber(db),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priority: input.priority,
    status: "backlog" as Status,
    sortOrder,
    epicId: input.epicId,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(backlogItems).values(item).run();
  return item;
}

export interface UpdateItemInput {
  id: string;
  title?: string;
  description?: string | null;
  priority?: Priority;
  status?: Status;
  sortOrder?: number;
  epicId?: string;
}

export function updateItem(db: DB, input: UpdateItemInput): void {
  if (input.epicId !== undefined) {
    const epic = db.select().from(epics).where(eq(epics.id, input.epicId)).get();
    if (!epic) throw new Error("Epic nicht gefunden");
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.status !== undefined) updates.status = input.status;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.epicId !== undefined) updates.epicId = input.epicId;

  db.update(backlogItems).set(updates).where(eq(backlogItems.id, input.id)).run();
}
```

Note on transactions: drizzle's `better-sqlite3` adapter exposes the underlying `Database` via an internal property. If the `$client` access above doesn't compile under strict typing, fall back to running the two statements without a wrapper (for this local app the atomicity risk is negligible — document this in the commit message if you take the fallback).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/db/epics.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/epics.ts src/lib/db/epics.test.ts src/lib/db/test-db.ts
git commit -m "feat(backlog): add epics service module with CRUD and progress"
```

---

## Task 4: Update seed script — create epics table, Orphans, pre-seed 7 epics, assign items

**Files:**
- Modify: `src/lib/db/seed.ts`

Idempotency requirements:
1. `CREATE TABLE IF NOT EXISTS epics` — safe on re-runs.
2. `ALTER TABLE backlog_items ADD COLUMN epic_id` — guarded (PRAGMA check) so second run doesn't error.
3. Orphans epic created via `ensureOrphansEpic`.
4. Backfill every `epic_id IS NULL` to Orphans.
5. If non-Orphan epics already exist, skip seeding the 7 themed epics but still run backfill.
6. Backlog item seeding stays as-is (skip if any items exist).

- [ ] **Step 1: Replace `src/lib/db/seed.ts`**

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";
import { backlogItems, epics } from "./schema";
import { generateId, formatBacklogNumber } from "../utils";
import { ensureOrphansEpic, createEpic } from "./epics";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const SEED_ITEMS = [
  { title: "External registry API: VIES (EU VAT validation)", priority: "high" as const, description: "Integrate VIES API to auto-validate VAT numbers. Provider pattern already in place." },
  { title: "External registry API: KREPTD (PL transport license)", priority: "high" as const, description: "Query Polish transport license register for license validity and vehicle count." },
  { title: "External registry API: BALM (DE transport register)", priority: "high" as const, description: "Query German BALM Verkehrsunternehmerdatei for German-based carriers." },
  { title: "External registry APIs: KRS, CEIDG, ONRC, ARR, RPSD", priority: "high" as const, description: "Remaining country-specific registries (PL, RO, CZ) from Datenquellen_Uebersicht." },
  { title: "User feedback collection process", priority: "high" as const, description: "In-app feedback mechanism for MVP testers — see spec Section 18." },
  { title: "Rebrand to SCHUNCK Group", priority: "medium" as const, description: "Swap Ecclesia brand tokens and logo for SCHUNCK Group identity. Brand is centralized in Tailwind theme — token swap only." },
  { title: "MS Entra Azure authentication", priority: "medium" as const, description: "Add SSO login for broker and client access. Required before client rollout." },
  { title: "Multi-tenant client access & billing", priority: "medium" as const, description: "Role-based access (broker vs. client), per-check billing (2-5 EUR), PayPal/digital payment." },
  { title: "TIMOCOM API integration", priority: "medium" as const, description: "Auto-pull carrier profile from TIMOCOM instead of manual upload." },
  { title: "Blacklist database integration", priority: "medium" as const, description: "Connect to TAPA, IConsult47, and other fraud databases for known-bad carrier matching." },
  { title: "Vercel + Turso deployment", priority: "medium" as const, description: "Migrate from local SQLite to Vercel hosting with Turso database." },
  { title: "Azure data persistence", priority: "low" as const, description: "Alternative to Turso: Azure-based file and data storage." },
  { title: "Fahrzeug-Fotoanalyse (vehicle photo analysis)", priority: "low" as const, description: "Use Claude vision to analyze vehicle photos for plausibility." },
  { title: "Graph-based pattern analysis", priority: "low" as const, description: "Cross-check carriers against a relationship graph of known entities." },
  { title: "Agent-to-Agent cooperation", priority: "low" as const, description: "Compliance agent, legal agent, etc. working together on complex cases." },
];

// Epic assignments are by item title-substring for robustness across reseed scenarios.
const EPIC_DEFINITIONS = [
  {
    title: "External Registries",
    description: "VAT and transport-license registry integrations across EU.",
    priority: "high" as const,
    titleMatchers: ["VIES", "KREPTD", "BALM", "KRS, CEIDG, ONRC"],
  },
  {
    title: "Deployment & Hosting",
    description: "Moving off local SQLite to a managed hosting target.",
    priority: "medium" as const,
    titleMatchers: ["Vercel + Turso", "Azure data persistence"],
  },
  {
    title: "Monetization & Access",
    description: "Authentication, multi-tenancy, billing.",
    priority: "medium" as const,
    titleMatchers: ["MS Entra", "Multi-tenant client"],
  },
  {
    title: "Integrations",
    description: "Third-party feeds that accelerate carrier verification.",
    priority: "medium" as const,
    titleMatchers: ["TIMOCOM", "Blacklist database"],
  },
  {
    title: "Advanced Detection",
    description: "Next-generation signals beyond document and registry checks.",
    priority: "low" as const,
    titleMatchers: ["Fahrzeug-Fotoanalyse", "Graph-based pattern analysis", "Agent-to-Agent"],
  },
  {
    title: "Rebrand",
    description: "Visual identity migration from Ecclesia to SCHUNCK.",
    priority: "medium" as const,
    titleMatchers: ["Rebrand to SCHUNCK"],
  },
  {
    title: "Feedback Loop",
    description: "User feedback collection and triage.",
    priority: "high" as const,
    titleMatchers: ["User feedback collection"],
  },
];

async function seed() {
  const dbDir = path.join(process.cwd(), "data");
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "fakecarrier.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS checks (
      id TEXT PRIMARY KEY,
      check_number TEXT NOT NULL UNIQUE,
      carrier_name TEXT NOT NULL,
      carrier_country TEXT,
      carrier_vat_id TEXT,
      carrier_contact TEXT,
      risk_score REAL,
      confidence_level REAL,
      recommendation TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      check_id TEXT NOT NULL REFERENCES checks(id),
      document_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      extracted_fields TEXT,
      risk_signals TEXT,
      document_score REAL,
      confidence REAL,
      status TEXT NOT NULL DEFAULT 'uploaded',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      check_id TEXT NOT NULL REFERENCES checks(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS epics (
      id TEXT PRIMARY KEY,
      item_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_protected INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS backlog_items (
      id TEXT PRIMARY KEY,
      item_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      check_id TEXT REFERENCES checks(id),
      category TEXT NOT NULL,
      comment TEXT NOT NULL,
      page TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Idempotent: add epic_id column to backlog_items if missing.
  const cols = sqlite.prepare(`PRAGMA table_info(backlog_items)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "epic_id")) {
    sqlite.exec(`ALTER TABLE backlog_items ADD COLUMN epic_id TEXT`);
  }

  // Ensure Orphans exists.
  const orphans = ensureOrphansEpic(db);

  // Backfill any items without an epic to Orphans.
  sqlite
    .prepare(`UPDATE backlog_items SET epic_id = ?, updated_at = ? WHERE epic_id IS NULL OR epic_id = ''`)
    .run(orphans.id, new Date().toISOString());

  // Seed items if empty.
  const existingItems = db.select().from(backlogItems).all();
  if (existingItems.length === 0) {
    const now = new Date().toISOString();
    for (let i = 0; i < SEED_ITEMS.length; i++) {
      const item = SEED_ITEMS[i];
      db.insert(backlogItems).values({
        id: generateId(),
        itemNumber: formatBacklogNumber(i + 1),
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: "backlog",
        sortOrder: i,
        epicId: orphans.id,
        createdAt: now,
        updatedAt: now,
      }).run();
    }
    console.log(`Seeded ${SEED_ITEMS.length} backlog items.`);
  } else {
    console.log("Backlog items already seeded, skipping item seed.");
  }

  // Seed 7 themed epics ONLY if no non-Orphan epics exist yet.
  const nonOrphanCount = db
    .select({ c: sql<number>`count(*)` })
    .from(epics)
    .where(eq(epics.isProtected, 0))
    .get();
  if ((nonOrphanCount?.c ?? 0) === 0) {
    for (const def of EPIC_DEFINITIONS) {
      const epic = createEpic(db, {
        title: def.title,
        description: def.description,
        priority: def.priority,
      });
      // Assign matching items.
      for (const matcher of def.titleMatchers) {
        const matches = db
          .select()
          .from(backlogItems)
          .where(sql`title LIKE ${"%" + matcher + "%"}`)
          .all();
        for (const row of matches) {
          db.update(backlogItems)
            .set({ epicId: epic.id, updatedAt: new Date().toISOString() })
            .where(eq(backlogItems.id, row.id))
            .run();
        }
      }
    }
    console.log(`Seeded ${EPIC_DEFINITIONS.length} epics and reassigned matching items.`);
  } else {
    console.log("Epics already seeded, skipping epic seed.");
  }
}

seed();
```

Note: The existing `CREATE TABLE IF NOT EXISTS` blocks for `checks`, `documents`, `chat_messages`, `feedback` are carried over verbatim from the current `seed.ts`. Before editing, re-read the current file to confirm the column lists match.

- [ ] **Step 2: Blow away the dev DB and run the seed**

Run:
```bash
rm -f data/fakecarrier.db data/fakecarrier.db-wal data/fakecarrier.db-shm
npx tsx src/lib/db/seed.ts
```
Expected output:
```
Seeded 15 backlog items.
Seeded 7 epics and reassigned matching items.
```

- [ ] **Step 3: Verify Orphans is empty after the reassign**

Run (one-liner via `sqlite3`):
```bash
sqlite3 data/fakecarrier.db "SELECT e.item_number, e.title, COUNT(b.id) FROM epics e LEFT JOIN backlog_items b ON b.epic_id = e.id GROUP BY e.id ORDER BY e.sort_order;"
```
Expected: Orphans shows count 0; the other 7 epics cover all 15 items.

- [ ] **Step 4: Re-run seed to confirm idempotency**

Run: `npx tsx src/lib/db/seed.ts`
Expected output:
```
Backlog items already seeded, skipping item seed.
Epics already seeded, skipping epic seed.
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/seed.ts
git commit -m "feat(backlog): seed 8 epics and backfill items to Orphans"
```

---

## Task 5: `/api/epics` route

**Files:**
- Create: `src/app/api/epics/route.ts`

This is a thin wrapper over `src/lib/db/epics.ts`. No dedicated test here — the service module is already tested; this task just exposes it.

- [ ] **Step 1: Create the route**

Create `src/app/api/epics/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  listEpicsWithProgress,
  createEpic,
  updateEpic,
  deleteEpic,
} from "@/lib/db/epics";

export const dynamic = "force-dynamic";

export async function GET() {
  const epics = listEpicsWithProgress(db);
  return NextResponse.json({ epics });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "create") {
      if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
      }
      const priority = ((body.priority as string) || "medium") as
        "critical" | "high" | "medium" | "low";
      const epic = createEpic(db, {
        title: body.title,
        description: body.description ?? null,
        priority,
      });
      return NextResponse.json({ epic });
    }

    if (body.action === "update") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 });
      }
      updateEpic(db, {
        id: body.id,
        title: body.title,
        description: body.description,
        priority: body.priority,
        status: body.status,
        sortOrder: body.sortOrder,
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 });
      }
      deleteEpic(db, body.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interner Fehler";
    const status =
      message.includes("nicht gelöscht") ||
      message.includes("nicht bearbeitet") ||
      message.includes("nicht gefunden")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Manual smoke test**

Start dev server (`npm run dev`) in one shell, then in another:

```bash
curl -s http://localhost:3000/api/epics | head -c 500
```
Expected: JSON with 8 epics, each with a `progress` object, Orphans first (sortOrder 0, isProtected 1).

Create a test epic:
```bash
curl -s -X POST http://localhost:3000/api/epics \
  -H 'Content-Type: application/json' \
  -d '{"action":"create","title":"Integration test epic","priority":"low"}'
```
Expected: 200 with the new epic. Verify number is `EPIC-009` (next after the 8 seeded).

Delete it:
```bash
# Use the id from the response above.
curl -s -X POST http://localhost:3000/api/epics \
  -H 'Content-Type: application/json' \
  -d '{"action":"delete","id":"<paste-id>"}'
```
Expected: `{"success":true}`.

Try to delete Orphans:
```bash
sqlite3 data/fakecarrier.db "SELECT id FROM epics WHERE is_protected = 1;"
# copy the id
curl -s -X POST http://localhost:3000/api/epics \
  -H 'Content-Type: application/json' \
  -d '{"action":"delete","id":"<orphans-id>"}'
```
Expected: 400 with `"Dieses Epic kann nicht gelöscht werden"`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/epics/route.ts
git commit -m "feat(backlog): add /api/epics route"
```

---

## Task 6: Update `/api/backlog` route — require `epicId`

**Files:**
- Modify: `src/app/api/backlog/route.ts`

- [ ] **Step 1: Rewrite the route to delegate to the service module**

Replace `src/app/api/backlog/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backlogItems } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { createItem, updateItem } from "@/lib/db/epics";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = db
    .select()
    .from(backlogItems)
    .orderBy(asc(backlogItems.sortOrder))
    .all();

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "create") {
      if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
      }
      if (!body.epicId || typeof body.epicId !== "string") {
        return NextResponse.json({ error: "Epic ist erforderlich" }, { status: 400 });
      }
      const priority = ((body.priority as string) || "medium") as
        "critical" | "high" | "medium" | "low";
      const item = createItem(db, {
        title: body.title,
        description: body.description ?? null,
        priority,
        epicId: body.epicId,
      });
      return NextResponse.json({ item });
    }

    if (body.action === "update") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 });
      }
      updateItem(db, {
        id: body.id,
        title: body.title,
        description: body.description,
        priority: body.priority,
        status: body.status,
        sortOrder: body.sortOrder,
        epicId: body.epicId,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interner Fehler";
    const status = message.includes("nicht gefunden") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Manual smoke test**

```bash
# Missing epicId -> 400
curl -s -X POST http://localhost:3000/api/backlog \
  -H 'Content-Type: application/json' \
  -d '{"action":"create","title":"No parent","priority":"medium"}'
# Expected: {"error":"Epic ist erforderlich"}

# Valid create
sqlite3 data/fakecarrier.db "SELECT id FROM epics WHERE item_number = 'EPIC-002';"
curl -s -X POST http://localhost:3000/api/backlog \
  -H 'Content-Type: application/json' \
  -d '{"action":"create","title":"Temp item","priority":"low","epicId":"<paste-id>"}'
# Expected: 200 with new item
```

Verify that the existing Kanban at http://localhost:3000/backlog still renders 15+ items.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/backlog/route.ts
git commit -m "feat(backlog): require epicId on item create/update"
```

---

## Task 7: Shared components — `EpicFilter`, `AddEpicForm`, `EditItemModal`

**Files:**
- Create: `src/components/backlog/epic-filter.tsx`
- Create: `src/components/backlog/add-epic-form.tsx`
- Create: `src/components/backlog/edit-item-modal.tsx`

- [ ] **Step 1: Create `EpicFilter`**

Create `src/components/backlog/epic-filter.tsx`:

```tsx
"use client";

interface EpicOption {
  id: string;
  itemNumber: string;
  title: string;
}

interface EpicFilterProps {
  epics: EpicOption[];
  value: string; // "all" or itemNumber
  onChange: (value: string) => void;
}

export function EpicFilter({ epics, value, onChange }: EpicFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
    >
      <option value="all">Alle Epics</option>
      {epics.map((e) => (
        <option key={e.id} value={e.itemNumber}>
          {e.itemNumber} · {e.title}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Create `AddEpicForm`**

Create `src/components/backlog/add-epic-form.tsx`:

```tsx
"use client";

import { useState } from "react";

interface AddEpicFormProps {
  onAdd: (title: string, priority: string, description: string) => void;
}

export function AddEpicForm({ onAdd }: AddEpicFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), priority, description.trim());
    setTitle("");
    setDescription("");
    setPriority("medium");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-ec-medium-grey p-3 text-sm font-medium text-ec-grey-80 transition-colors hover:border-ec-dark-blue hover:text-ec-dark-blue"
      >
        + Neues Epic
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-ec-medium-grey bg-white p-4 shadow-sm"
    >
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        />
        <textarea
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        >
          <option value="critical">Kritisch</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </select>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
        >
          Hinzufügen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ec-medium-grey px-4 py-2 text-sm font-medium text-ec-grey-80 transition-colors hover:bg-ec-light-grey"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `EditItemModal`**

Create `src/components/backlog/edit-item-modal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface EpicOption {
  id: string;
  itemNumber: string;
  title: string;
}

interface EditItemModalProps {
  item: {
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: "critical" | "high" | "medium" | "low";
    epicId: string;
  } | null;
  epics: EpicOption[];
  onClose: () => void;
  onSave: (updates: {
    id: string;
    title: string;
    description: string;
    priority: string;
    epicId: string;
  }) => void;
}

export function EditItemModal({ item, epics, onClose, onSave }: EditItemModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [epicId, setEpicId] = useState("");

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setPriority(item.priority);
      setEpicId(item.epicId);
    }
  }, [item]);

  if (!item) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item || !title.trim() || !epicId) return;
    onSave({
      id: item.id,
      title: title.trim(),
      description: description.trim(),
      priority,
      epicId,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-barlow text-lg font-semibold text-ec-dark-blue">
            {item.itemNumber} bearbeiten
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-ec-grey-80 hover:bg-ec-light-grey"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-ec-grey-80">Epic</span>
            <select
              value={epicId}
              onChange={(e) => setEpicId(e.target.value)}
              className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
            >
              {epics.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.itemNumber} · {ep.title}
                </option>
              ))}
            </select>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          >
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ec-medium-grey px-4 py-2 text-sm font-medium text-ec-grey-80 transition-colors hover:bg-ec-light-grey"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/backlog/epic-filter.tsx src/components/backlog/add-epic-form.tsx src/components/backlog/edit-item-modal.tsx
git commit -m "feat(backlog): add epic filter, add-epic form, and edit-item modal components"
```

---

## Task 8: Update Kanban card and add-item form — epic chip, epic selector

**Files:**
- Modify: `src/components/backlog/kanban-card.tsx`
- Modify: `src/components/backlog/kanban-column.tsx`
- Modify: `src/components/backlog/add-item-form.tsx`

- [ ] **Step 1: Update `kanban-card.tsx` to show the epic chip and accept an onClick**

Replace the file with:

```tsx
import { Badge } from "@/components/ui/badge";

interface KanbanCardProps {
  item: {
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: "critical" | "high" | "medium" | "low";
  };
  epic?: { itemNumber: string; title: string } | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick?: (id: string) => void;
}

const priorityLabel: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

export function KanbanCard({ item, epic, onDragStart, onClick }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onClick={() => onClick?.(item.id)}
      className="cursor-grab rounded-lg border border-ec-medium-grey bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-xs text-ec-grey-80">
          {item.itemNumber}
        </span>
        <Badge variant={item.priority}>
          {priorityLabel[item.priority] || item.priority}
        </Badge>
      </div>
      <p className="text-sm font-medium text-ec-dark-blue">{item.title}</p>
      {epic && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ec-grey-80">
          {epic.itemNumber} · {epic.title}
        </p>
      )}
      {item.description && (
        <p className="mt-1 line-clamp-2 text-xs text-ec-grey-80">
          {item.description}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `kanban-column.tsx` to pass epic + onClick through**

Replace with:

```tsx
import { KanbanCard } from "./kanban-card";

interface ColumnItem {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  epic?: { itemNumber: string; title: string } | null;
}

interface KanbanColumnProps {
  title: string;
  status: string;
  items: ColumnItem[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onCardClick?: (id: string) => void;
}

export function KanbanColumn({
  title,
  status,
  items,
  onDragStart,
  onDrop,
  onCardClick,
}: KanbanColumnProps) {
  return (
    <div
      className="flex flex-col rounded-xl border border-ec-medium-grey bg-ec-light-grey/50 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-barlow text-sm font-semibold uppercase tracking-wide text-ec-grey-80">
          {title}
        </h3>
        <span className="rounded-full bg-ec-medium-grey px-2 py-0.5 text-xs font-medium text-ec-grey-80">
          {items.length}
        </span>
      </div>
      <div className="flex min-h-[200px] flex-col gap-2">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            epic={item.epic}
            onDragStart={onDragStart}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `add-item-form.tsx` to include an Epic selector**

Replace with:

```tsx
"use client";

import { useState } from "react";

interface EpicOption {
  id: string;
  itemNumber: string;
  title: string;
}

interface AddItemFormProps {
  epics: EpicOption[];
  defaultEpicId: string;
  onAdd: (
    title: string,
    priority: string,
    description: string,
    epicId: string,
  ) => void;
}

export function AddItemForm({ epics, defaultEpicId, onAdd }: AddItemFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [epicId, setEpicId] = useState(defaultEpicId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !epicId) return;
    onAdd(title.trim(), priority, description.trim(), epicId);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setEpicId(defaultEpicId);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-ec-medium-grey p-3 text-sm font-medium text-ec-grey-80 transition-colors hover:border-ec-dark-blue hover:text-ec-dark-blue"
      >
        + Neuer Eintrag
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-ec-medium-grey bg-white p-4 shadow-sm"
    >
      <div className="space-y-3">
        <select
          value={epicId}
          onChange={(e) => setEpicId(e.target.value)}
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        >
          {epics.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.itemNumber} · {ep.title}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        />
        <textarea
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        >
          <option value="critical">Kritisch</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </select>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
        >
          Hinzufügen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ec-medium-grey px-4 py-2 text-sm font-medium text-ec-grey-80 transition-colors hover:bg-ec-light-grey"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: FAIL — `src/app/backlog/page.tsx` still calls `AddItemForm` with the old signature. That's fixed in Task 10.

- [ ] **Step 5: Commit**

```bash
git add src/components/backlog/kanban-card.tsx src/components/backlog/kanban-column.tsx src/components/backlog/add-item-form.tsx
git commit -m "feat(backlog): render epic chip on cards; add epic selector in add-item form"
```

---

## Task 9: Epics overview page

**Files:**
- Create: `src/app/backlog/epics/page.tsx`
- Create: `src/components/backlog/epic-card.tsx`

- [ ] **Step 1: Create `epic-card.tsx`**

Create `src/components/backlog/epic-card.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface EpicCardProps {
  epic: {
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: "critical" | "high" | "medium" | "low";
    status: "backlog" | "in_progress" | "done";
    isProtected: number;
    progress: { total: number; done: number; inProgress: number };
  };
  onDelete: (id: string) => void;
}

const priorityLabel: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

const statusLabel: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Arbeit",
  done: "Erledigt",
};

export function EpicCard({ epic, onDelete }: EpicCardProps) {
  const pct =
    epic.progress.total === 0
      ? 0
      : Math.round((epic.progress.done / epic.progress.total) * 100);

  return (
    <div className="flex flex-col rounded-xl border border-ec-medium-grey bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-xs text-ec-grey-80">{epic.itemNumber}</span>
          <h3 className="font-barlow text-base font-semibold text-ec-dark-blue">
            {epic.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={epic.priority}>
            {priorityLabel[epic.priority] || epic.priority}
          </Badge>
          <span className="text-[10px] uppercase tracking-wide text-ec-grey-80">
            {statusLabel[epic.status]}
          </span>
        </div>
      </div>

      {epic.description && (
        <p className="mb-3 text-xs text-ec-grey-80">{epic.description}</p>
      )}

      <div className="mb-1 flex items-center justify-between text-xs text-ec-grey-80">
        <span>
          {epic.progress.done}/{epic.progress.total} erledigt
          {epic.progress.inProgress > 0 && ` · ${epic.progress.inProgress} in Arbeit`}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-ec-light-grey">
        <div
          className="h-full bg-ec-dark-blue transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-auto flex items-center justify-between">
        <Link
          href={`/backlog?epic=${epic.itemNumber}`}
          className="text-xs font-medium text-ec-dark-blue hover:underline"
        >
          Öffnen →
        </Link>
        {epic.isProtected === 1 ? (
          <span className="text-[10px] uppercase tracking-wide text-ec-grey-80">
            Geschützt
          </span>
        ) : (
          <button
            onClick={() => {
              if (confirm(`Epic ${epic.itemNumber} löschen? Items wandern zu Orphans.`)) {
                onDelete(epic.id);
              }
            }}
            className="text-xs text-ec-red hover:underline"
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the overview page**

Create `src/app/backlog/epics/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { EpicCard } from "@/components/backlog/epic-card";
import { AddEpicForm } from "@/components/backlog/add-epic-form";

interface Epic {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  isProtected: number;
  progress: { total: number; done: number; inProgress: number };
}

export default function EpicsPage() {
  const [epics, setEpics] = useState<Epic[]>([]);

  const fetchEpics = useCallback(async () => {
    const res = await fetch("/api/epics");
    const data = await res.json();
    setEpics(data.epics);
  }, []);

  useEffect(() => {
    fetchEpics();
  }, [fetchEpics]);

  async function handleAdd(title: string, priority: string, description: string) {
    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, priority, description }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    await fetchEpics();
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    await fetchEpics();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-barlow text-3xl font-semibold text-ec-dark-blue">
          Epics
        </h1>
      </div>

      <AddEpicForm onAdd={handleAdd} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {epics.map((epic) => (
          <EpicCard key={epic.id} epic={epic} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual check**

Start `npm run dev` and visit http://localhost:3000/backlog/epics. Expected:
- 8 epic cards rendered in order EPIC-001 … EPIC-008.
- Orphans shows 0/0 and a "Geschützt" label (no delete button).
- Each non-Orphan epic's counts reflect its assigned items.
- Creating a new epic via the form updates the grid.

- [ ] **Step 4: Commit**

```bash
git add src/components/backlog/epic-card.tsx src/app/backlog/epics/page.tsx
git commit -m "feat(backlog): add /backlog/epics overview page with progress"
```

---

## Task 10: Main Kanban page — epic filter, URL param, click-to-edit

**Files:**
- Modify: `src/app/backlog/page.tsx`

- [ ] **Step 1: Replace `src/app/backlog/page.tsx`**

```tsx
"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanColumn } from "@/components/backlog/kanban-column";
import { AddItemForm } from "@/components/backlog/add-item-form";
import { EpicFilter } from "@/components/backlog/epic-filter";
import { EditItemModal } from "@/components/backlog/edit-item-modal";

interface BacklogItem {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  sortOrder: number;
  epicId: string;
}

interface Epic {
  id: string;
  itemNumber: string;
  title: string;
  isProtected: number;
}

const columns = [
  { status: "backlog", title: "Backlog" },
  { status: "in_progress", title: "In Arbeit" },
  { status: "done", title: "Erledigt" },
];

function BacklogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const epicParam = searchParams.get("epic") ?? "all";

  const [items, setItems] = useState<BacklogItem[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/backlog");
    const data = await res.json();
    setItems(data.items);
  }, []);

  const fetchEpics = useCallback(async () => {
    const res = await fetch("/api/epics");
    const data = await res.json();
    setEpics(data.epics);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchEpics();
  }, [fetchItems, fetchEpics]);

  function setEpicFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("epic");
    } else {
      params.set("epic", value);
    }
    const qs = params.toString();
    router.replace(qs ? `/backlog?${qs}` : "/backlog");
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(_e: React.DragEvent, newStatus: string) {
    if (!draggedId) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === draggedId
          ? { ...item, status: newStatus as BacklogItem["status"] }
          : item,
      ),
    );
    const id = draggedId;
    setDraggedId(null);
    await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, status: newStatus }),
    });
  }

  async function handleAdd(
    title: string,
    priority: string,
    description: string,
    epicId: string,
  ) {
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, priority, description, epicId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
    await fetchEpics(); // progress refresh
  }

  async function handleSaveEdit(updates: {
    id: string;
    title: string;
    description: string;
    priority: string;
    epicId: string;
  }) {
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ...updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === updates.id
          ? {
              ...i,
              title: updates.title,
              description: updates.description,
              priority: updates.priority as BacklogItem["priority"],
              epicId: updates.epicId,
            }
          : i,
      ),
    );
    setEditingId(null);
    await fetchEpics();
  }

  const epicById = new Map(epics.map((e) => [e.id, e]));
  const epicByNumber = new Map(epics.map((e) => [e.itemNumber, e]));
  const epicFilterValue = epicParam;
  const selectedEpic = epicFilterValue !== "all" ? epicByNumber.get(epicFilterValue) : null;

  const filtered = items.filter((i) => {
    if (priorityFilter !== "all" && i.priority !== priorityFilter) return false;
    if (selectedEpic && i.epicId !== selectedEpic.id) return false;
    return true;
  });

  const decoratedItems = filtered.map((i) => {
    const epic = epicById.get(i.epicId);
    return {
      ...i,
      epic: epic ? { itemNumber: epic.itemNumber, title: epic.title } : null,
    };
  });

  const orphans = epics.find((e) => e.isProtected === 1);
  const defaultEpicId = orphans?.id ?? epics[0]?.id ?? "";
  const editingItem = editingId ? items.find((i) => i.id === editingId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-barlow text-3xl font-semibold text-ec-dark-blue">
          Backlog
        </h1>
        <div className="flex gap-2">
          <EpicFilter
            epics={epics.map((e) => ({ id: e.id, itemNumber: e.itemNumber, title: e.title }))}
            value={epicFilterValue}
            onChange={setEpicFilter}
          />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          >
            <option value="all">Alle Prioritäten</option>
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
        </div>
      </div>

      <AddItemForm
        epics={epics.map((e) => ({ id: e.id, itemNumber: e.itemNumber, title: e.title }))}
        defaultEpicId={selectedEpic?.id ?? defaultEpicId}
        onAdd={handleAdd}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            items={decoratedItems.filter((i) => i.status === col.status)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onCardClick={(id) => setEditingId(id)}
          />
        ))}
      </div>

      <EditItemModal
        item={
          editingItem
            ? {
                id: editingItem.id,
                itemNumber: editingItem.itemNumber,
                title: editingItem.title,
                description: editingItem.description,
                priority: editingItem.priority,
                epicId: editingItem.epicId,
              }
            : null
        }
        epics={epics.map((e) => ({ id: e.id, itemNumber: e.itemNumber, title: e.title }))}
        onClose={() => setEditingId(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

export default function BacklogPage() {
  return (
    <Suspense fallback={null}>
      <BacklogPageInner />
    </Suspense>
  );
}
```

Note: `useSearchParams` in Next.js 15 requires a Suspense boundary at the page level (the wrapper is why `BacklogPageInner` exists).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual verification in browser**

Start `npm run dev` and visit http://localhost:3000/backlog. Verify:

1. Priority + Epic filter dropdowns both visible.
2. Each card shows its epic chip line (`EPIC-00X · Title`).
3. Clicking a card opens the edit modal pre-filled; saving persists title/description/priority/epic changes and the card re-renders in the right column.
4. Dragging a card between columns still works (status change).
5. Selecting an epic from the filter narrows the board; URL shows `?epic=EPIC-00X`; Add Item form defaults that epic.
6. Creating a new item with the Add Item form requires picking an epic (pre-filled).
7. Deep link: open `http://localhost:3000/backlog?epic=EPIC-002` directly — filter is active on load.

- [ ] **Step 4: Commit**

```bash
git add src/app/backlog/page.tsx
git commit -m "feat(backlog): epic filter, URL param, click-to-edit modal"
```

---

## Task 11: Nav link — "Epics"

**Files:**
- Modify: `src/components/layout/nav-links.tsx`

- [ ] **Step 1: Add the "Epics" link**

Update the `links` array:

```tsx
const links = [
  { href: "/", label: "Start" },
  { href: "/check", label: "Neue Prüfung" },
  { href: "/history", label: "Verlauf" },
  { href: "/backlog", label: "Backlog" },
  { href: "/backlog/epics", label: "Epics" },
  { href: "/feedback", label: "Feedback" },
];
```

The existing active-state logic (`pathname.startsWith(link.href)`) would mark both "Backlog" and "Epics" active when on `/backlog/epics`. Fix by switching "Backlog" to exact-match:

Replace the `isActive` computation with:

```tsx
const isActive =
  link.href === "/"
    ? pathname === "/"
    : link.href === "/backlog"
      ? pathname === "/backlog"
      : pathname.startsWith(link.href);
```

- [ ] **Step 2: Manual check**

Visit `/backlog` — only "Backlog" is highlighted. Visit `/backlog/epics` — only "Epics" is highlighted.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/nav-links.tsx
git commit -m "feat(nav): add Epics link alongside Backlog"
```

---

## Task 12: Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: End-to-end UI smoke**

With `npm run dev` running:
1. `/backlog` renders 15 items spread across epics; each card shows epic chip.
2. `/backlog/epics` shows 8 epics with correct counts; Orphans empty.
3. Create a new epic "Demo" via the Epics page — appears on the page AND in the filter dropdown on `/backlog`.
4. Create a new item on `/backlog`, assign to "Demo" — chip shows `EPIC-009 · Demo`.
5. Click the new item → modal → reassign to Orphans → Save. Chip updates to `EPIC-001 · Orphans`. Orphans count increments on `/backlog/epics`.
6. Delete "Demo" epic from `/backlog/epics` (confirm dialog). Any remaining items move to Orphans. The epic vanishes.
7. Delete button on Orphans card does not exist (should be "Geschützt").
8. Deep link `/backlog?epic=EPIC-002` filters on load.

- [ ] **Step 4: No regressions in other pages**

Visit `/` , `/check`, `/history`, `/feedback` — each loads without console errors.

- [ ] **Step 5: Final commit (if any)**

If anything was adjusted during verification, commit it with an explanatory message. Otherwise, skip.

---

## Summary of acceptance

- Schema: `epics` table exists, `backlog_items.epic_id NOT NULL` enforced in code.
- Seed: idempotent; Orphans protected; 7 themed epics + Orphans on fresh DB.
- API: `/api/epics` supports GET, create, update, delete; `/api/backlog` requires `epicId`.
- UI: Epic filter + chip on Kanban, click-to-edit modal with epic reassignment, `/backlog/epics` overview with progress bars, nav link present.
- Tests: all vitest suites green.
- Protected Orphans cannot be deleted or edited via API.

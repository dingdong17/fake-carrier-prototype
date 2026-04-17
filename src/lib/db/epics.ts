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
  const tx = (
    db as unknown as {
      $client: { transaction: (fn: () => void) => () => void };
    }
  ).$client.transaction(() => {
    db.update(backlogItems)
      .set({ epicId: orphans.id, updatedAt: new Date().toISOString() })
      .where(eq(backlogItems.epicId, id))
      .run();
    db.delete(epics).where(eq(epics.id, id)).run();
  });
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

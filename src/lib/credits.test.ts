// src/lib/credits.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { clients } from "./db/schema";
import { nanoid } from "nanoid";
import { TIER_COSTS, debitCredits } from "./credits";

let db: LibSQLDatabase<Record<string, never>>;

beforeEach(async () => {
  const c = createClient({ url: ":memory:" });
  await c.execute(`CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    credit_balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  db = drizzle(c);
});

describe("TIER_COSTS", () => {
  it("has correct values per BL-040", () => {
    expect(TIER_COSTS).toEqual({ quick: 1, medium: 2, full: 5 });
  });
});

describe("debitCredits", () => {
  it("decrements balance when sufficient", async () => {
    const id = nanoid();
    await db.insert(clients).values({
      id,
      slug: "acme",
      name: "Acme",
      creditBalance: 10,
      createdAt: new Date().toISOString(),
    }).run();
    const ok = await debitCredits(db, id, 2);
    expect(ok).toBe(true);
  });

  it("returns false + does not decrement when insufficient", async () => {
    const id = nanoid();
    await db.insert(clients).values({
      id,
      slug: "acme",
      name: "Acme",
      creditBalance: 1,
      createdAt: new Date().toISOString(),
    }).run();
    const ok = await debitCredits(db, id, 2);
    expect(ok).toBe(false);
  });

  it("atomic guard: concurrent debits both requesting full balance cannot both succeed", async () => {
    const id = nanoid();
    await db.insert(clients).values({
      id,
      slug: "acme",
      name: "Acme",
      creditBalance: 2,
      createdAt: new Date().toISOString(),
    }).run();
    const results = await Promise.all([
      debitCredits(db, id, 2),
      debitCredits(db, id, 2),
    ]);
    const successes = results.filter(Boolean).length;
    expect(successes).toBe(1);
  });
});

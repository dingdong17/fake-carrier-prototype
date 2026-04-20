// src/lib/auth/rate-limit.ts
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

let initialized = false;
async function ensureTable() {
  if (initialized) return;
  await db.run(sql`CREATE TABLE IF NOT EXISTS magic_link_requests (
    email TEXT NOT NULL,
    ts INTEGER NOT NULL
  )`);
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS idx_mlr_email_ts ON magic_link_requests(email, ts)`
  );
  initialized = true;
}

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_IN_WINDOW = 5;

export async function allowMagicLinkRequest(email: string): Promise<boolean> {
  await ensureTable();
  const cutoff = Date.now() - WINDOW_MS;
  // Purge old rows — cheap bound (MAX_IN_WINDOW per email).
  await db.run(sql`DELETE FROM magic_link_requests WHERE ts < ${cutoff}`);
  const result = await db.all<{ c: number }>(
    sql`SELECT count(*) as c FROM magic_link_requests WHERE email = ${email} AND ts >= ${cutoff}`
  );
  const count = result[0]?.c ?? 0;
  if (count >= MAX_IN_WINDOW) return false;
  await db.run(
    sql`INSERT INTO magic_link_requests (email, ts) VALUES (${email}, ${Date.now()})`
  );
  return true;
}

import Database from "better-sqlite3";
import { createClient } from "@libsql/client";

const sqlitePath = process.argv[2] || "./data/fakecarrier.db";
const src = new Database(sqlitePath, { readonly: true });

const dst = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const tables = [
  "checks",
  "documents",
  "chat_messages",
  "backlog_items",
  "feedback",
];

async function main() {
  for (const table of tables) {
    const rows = src.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    console.log(`Migrating ${rows.length} row(s) from ${table}`);
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;
    const statements = rows.map((r) => ({
      sql,
      args: cols.map((c) => r[c] as string | number | null),
    }));
    await dst.batch(statements, "write");
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// scripts/mark-backlog-done.ts
// One-shot: mark backlog items as "done" by their item_number (e.g. BL-009).
// Usage: npx tsx --env-file=.env.local scripts/mark-backlog-done.ts BL-009 BL-010 BL-043
import { createClient } from "@libsql/client";

async function main() {
  const itemNumbers = process.argv.slice(2);
  if (itemNumbers.length === 0) {
    console.error("Usage: mark-backlog-done.ts <BL-XXX> [BL-YYY ...]");
    process.exit(1);
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/fakecarrier.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const placeholders = itemNumbers.map(() => "?").join(",");
  const before = await client.execute({
    sql: `SELECT item_number, title, status FROM backlog_items WHERE item_number IN (${placeholders}) ORDER BY item_number`,
    args: itemNumbers,
  });
  console.log("before:");
  console.table(before.rows);

  const missing = itemNumbers.filter(
    (n) => !before.rows.some((r) => r.item_number === n)
  );
  if (missing.length) {
    console.error(`Not found: ${missing.join(", ")}`);
    client.close();
    process.exit(1);
  }

  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `UPDATE backlog_items SET status = 'done', updated_at = ? WHERE item_number IN (${placeholders})`,
    args: [now, ...itemNumbers],
  });
  console.log(`rows affected: ${result.rowsAffected}`);

  const after = await client.execute({
    sql: `SELECT item_number, title, status FROM backlog_items WHERE item_number IN (${placeholders}) ORDER BY item_number`,
    args: itemNumbers,
  });
  console.log("after:");
  console.table(after.rows);

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

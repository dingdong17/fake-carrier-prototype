// scripts/fix-admin-name.ts
// One-shot: sanitize trailing whitespace/newlines on a user's name.
// Usage: node --env-file=.env.local -r tsx/cjs scripts/fix-admin-name.ts
// (or:   npx tsx --env-file=.env.local scripts/fix-admin-name.ts)
import { createClient } from "@libsql/client";

async function main() {
  const email = process.argv[2] ?? "don.rorlach@covermesh.com";
  const newName = process.argv[3] ?? "Don Rorlach";

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/fakecarrier.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const before = await client.execute({
    sql: "SELECT id, email, name FROM users WHERE email = ?",
    args: [email],
  });
  console.log("before:", before.rows);

  if (before.rows.length === 0) {
    console.error(`No user with email ${email}`);
    client.close();
    process.exit(1);
  }

  const result = await client.execute({
    sql: "UPDATE users SET name = ? WHERE email = ?",
    args: [newName, email],
  });
  console.log("rows affected:", result.rowsAffected);

  const after = await client.execute({
    sql: "SELECT id, email, name FROM users WHERE email = ?",
    args: [email],
  });
  console.log("after:", after.rows);

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

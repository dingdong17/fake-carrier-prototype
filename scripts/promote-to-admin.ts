// scripts/promote-to-admin.ts
// One-shot: promote a user to admin by email.
// Usage: npx tsx --env-file=.env.local scripts/promote-to-admin.ts user@covermesh.com
import { createClient } from "@libsql/client";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: promote-to-admin.ts <email>");
    process.exit(1);
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/fakecarrier.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const before = await client.execute({
    sql: "SELECT id, email, role FROM users WHERE email = ?",
    args: [email],
  });
  console.log("before:");
  console.table(before.rows);

  if (before.rows.length === 0) {
    console.error(`No user with email ${email}`);
    client.close();
    process.exit(1);
  }

  const result = await client.execute({
    sql: "UPDATE users SET role = 'admin' WHERE email = ?",
    args: [email],
  });
  console.log(`rows affected: ${result.rowsAffected}`);

  const after = await client.execute({
    sql: "SELECT id, email, role FROM users WHERE email = ?",
    args: [email],
  });
  console.log("after:");
  console.table(after.rows);

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

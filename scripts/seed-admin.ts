// scripts/seed-admin.ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { users } from "../src/lib/db/schema";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";
  if (!email) {
    throw new Error("SEED_ADMIN_EMAIL is required");
  }
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/fakecarrier.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) {
    console.log(`Admin ${email} already exists — no-op.`);
    client.close();
    return;
  }

  await db
    .insert(users)
    .values({
      id: nanoid(),
      email,
      name,
      role: "admin",
      clientId: null,
    })
    .run();

  console.log(`Seeded admin: ${email}`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

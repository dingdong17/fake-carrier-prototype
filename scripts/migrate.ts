import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/fakecarrier.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isRemote = !url.startsWith("file:");
const inCi = !!process.env.VERCEL || !!process.env.CI;

if (inCi && !isRemote) {
  console.error(
    "[migrate] refusing to run: TURSO_DATABASE_URL is not set in CI/Vercel env. " +
      "Add it to the Vercel project env for every environment that builds (Production, Preview).",
  );
  process.exit(1);
}

const target = isRemote ? `Turso (${new URL(url).host})` : `local SQLite (${url})`;
console.log(`[migrate] applying migrations → ${target}`);

const client = createClient(authToken ? { url, authToken } : { url });
const db = drizzle(client);

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    console.log("[migrate] done");
    process.exit(0);
  })
  .catch((e: Error & { cause?: unknown }) => {
    console.error("[migrate] failed:", e.message);
    if (e.cause) console.error("[migrate] cause:", e.cause);
    process.exit(1);
  });

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { generateId } from "../src/lib/utils";

// MESZ (CEST) is UTC+2 — so 10:00 MESZ = 08:00 UTC
const SLOTS: Array<{
  startsAt: string;
  endsAt: string;
  maxAttendees: number;
}> = [
  { startsAt: "2026-06-04T08:00:00.000Z", endsAt: "2026-06-04T09:00:00.000Z", maxAttendees: 50 },
  { startsAt: "2026-06-11T12:00:00.000Z", endsAt: "2026-06-11T13:00:00.000Z", maxAttendees: 50 },
  { startsAt: "2026-06-25T07:30:00.000Z", endsAt: "2026-06-25T08:30:00.000Z", maxAttendees: 50 },
];

async function main() {
  const url = process.env.TURSO_DATABASE_URL || "file:./data/fakecarrier.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient(authToken ? { url, authToken } : { url });
  const db = drizzle(client, { schema });

  for (const s of SLOTS) {
    const existing = await db
      .select()
      .from(schema.webinarSlots)
      .where(eq(schema.webinarSlots.startsAt, s.startsAt))
      .get();
    if (existing) {
      console.log(`skip existing ${s.startsAt}`);
      continue;
    }
    await db.insert(schema.webinarSlots).values({
      id: generateId(),
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      timezone: "Europe/Berlin",
      maxAttendees: s.maxAttendees,
      isActive: true,
    });
    console.log(`inserted ${s.startsAt}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

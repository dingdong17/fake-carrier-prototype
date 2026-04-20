// src/lib/auth/scope-check.ts
import { db } from "@/lib/db";
import { checks, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { assertClientScope } from "./session";
import type { Session } from "next-auth";

export type CheckScopeResult = {
  check: typeof checks.$inferSelect;
  client: typeof clients.$inferSelect;
};

/**
 * Loads the check + its client, asserts the session user has access, returns both.
 * Throws AuthError (forbidden) if the user is a client and owns a different slug.
 * Throws a plain Error if the check or its client can't be found (handler should map to 404).
 */
export async function requireCheckScope(
  user: Session["user"],
  checkId: string
): Promise<CheckScopeResult> {
  const check = await db.select().from(checks).where(eq(checks.id, checkId)).get();
  if (!check) throw new Error("Check not found");
  const client = await db.select().from(clients).where(eq(clients.id, check.clientId)).get();
  if (!client) throw new Error("Client not found");
  assertClientScope(user, client.slug);
  return { check, client };
}

// src/lib/credits.ts
import { sql } from "drizzle-orm";
import { clients } from "./db/schema";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

export const TIER_COSTS = { quick: 1, medium: 2, full: 5 } as const;
export type Tier = keyof typeof TIER_COSTS;

/**
 * Atomic credit debit. Returns true if the balance was decremented by `cost`;
 * false if the row doesn't exist OR the balance was insufficient.
 *
 * Implementation: UPDATE ... WHERE id = ? AND credit_balance >= cost.
 * rowsAffected === 1 means the guarded update landed exactly once; any
 * concurrent second call will see the already-lowered balance and miss
 * the WHERE clause.
 */
export async function debitCredits(
  db: LibSQLDatabase<Record<string, unknown>>,
  clientId: string,
  cost: number
): Promise<boolean> {
  const result = await db
    .update(clients)
    .set({ creditBalance: sql`${clients.creditBalance} - ${cost}` })
    .where(sql`${clients.id} = ${clientId} AND ${clients.creditBalance} >= ${cost}`)
    .run();
  return result.rowsAffected === 1;
}

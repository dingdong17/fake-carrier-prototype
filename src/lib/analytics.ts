import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";

export async function logEvent(
  event: string,
  data: {
    checkId?: string;
    documentId?: string;
    durationMs?: number;
    meta?: Record<string, unknown>;
  } = {}
): Promise<void> {
  console.log(`[analytics] ${event}`, data);
  try {
    await db
      .insert(analyticsEvents)
      .values({
        id: generateId(),
        event,
        checkId: data.checkId ?? null,
        documentId: data.documentId ?? null,
        durationMs: data.durationMs ?? null,
        meta: data.meta ? JSON.stringify(data.meta) : null,
      })
      .run();
  } catch (err) {
    console.warn(`[analytics] DB write failed: ${err}`);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";

const ALLOWED_EVENTS = new Set([
  "landing_view",
  "hero_webinar_cta_click",
  "hero_beta_cta_click",
  "hero_login_cta_click",
  "hero_secondary_cta_click",
  "header_login_click",
  "header_webinar_click",
  "header_beta_click",
  "webinar_register_submitted",
  "webinar_confirmed",
  "demo_register_submitted",
  "demo_confirmed",
]);

// Conservative allowlist of meta keys we accept. Anything else is dropped to
// keep PII out of the events table.
const META_KEY_ALLOW = new Set([
  "section",
  "variant",
  "slotId",
  "remaining",
  "errorCode",
]);

function sanitizeMeta(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!META_KEY_ALLOW.has(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true }); // best-effort; never block UX
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const event = typeof b.event === "string" ? b.event : "";
  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ ok: true });
  }

  try {
    await db.insert(analyticsEvents).values({
      id: generateId(),
      event,
      meta: sanitizeMeta(b.meta),
    });
  } catch (err) {
    console.error("analytics insert failed:", err);
  }
  return NextResponse.json({ ok: true });
}

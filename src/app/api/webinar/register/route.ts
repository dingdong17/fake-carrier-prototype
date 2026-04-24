import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webinarSlots, webinarRegistrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import {
  generateConfirmToken,
  TOKEN_TTL_MS,
} from "@/lib/webinar/tokens";
import { sendWebinarConfirmationEmail } from "@/lib/webinar/send-confirmation";
import { slotDayLabel, slotTimeLabel } from "@/lib/webinar/format";

const MAX_NAME = 120;
const MAX_COMPANY = 160;
const MAX_EMAIL = 160;
const MAX_ROLE = 80;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function cleanStr(x: unknown, max: number): string | null {
  if (typeof x !== "string") return null;
  const t = x.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
}

function isEmail(x: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("invalid_json");
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const slotId = cleanStr(b.slotId, 64);
  const name = cleanStr(b.name, MAX_NAME);
  const company = cleanStr(b.company, MAX_COMPANY);
  const email = cleanStr(b.email, MAX_EMAIL);
  const role = cleanStr(b.role, MAX_ROLE);
  const consent = b.consent === true;

  if (!slotId || !name || !company || !email || !role) {
    return bad("missing_fields");
  }
  if (!isEmail(email)) return bad("invalid_email");
  if (!consent) return bad("consent_required");

  const slot = await db
    .select()
    .from(webinarSlots)
    .where(and(eq(webinarSlots.id, slotId), eq(webinarSlots.isActive, true)))
    .get();
  if (!slot) return bad("slot_not_found", 404);

  // One pending/confirmed registration per email per slot
  const existing = await db
    .select()
    .from(webinarRegistrations)
    .where(
      and(
        eq(webinarRegistrations.slotId, slotId),
        eq(webinarRegistrations.email, email.toLowerCase())
      )
    )
    .get();
  if (existing && existing.status !== "cancelled") {
    // Silent OK — do not leak whether an email is already registered
    return NextResponse.json({ ok: true });
  }

  const confirmToken = generateConfirmToken();
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(webinarRegistrations).values({
    id: generateId(),
    slotId,
    name,
    company,
    email: email.toLowerCase(),
    role,
    consentAt: new Date().toISOString(),
    status: "pending_confirm",
    confirmToken,
    confirmTokenExpires: expires,
  });

  const origin = new URL(req.url).origin;
  const confirmUrl = `${origin}/webinar/confirm?token=${encodeURIComponent(
    confirmToken
  )}`;

  try {
    await sendWebinarConfirmationEmail({
      to: email,
      name,
      slotLabel: `${slotDayLabel(slot.startsAt)}, ${slotTimeLabel(
        slot.startsAt,
        slot.endsAt
      )}`,
      confirmUrl,
    });
  } catch (err) {
    console.error("webinar email send failed:", err);
    // Don't fail the request — registration row is created, user can be
    // emailed later. Surface as ok to avoid leaking provider state.
  }

  return NextResponse.json({ ok: true });
}

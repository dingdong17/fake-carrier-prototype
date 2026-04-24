import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demoRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import {
  generateConfirmToken,
  TOKEN_TTL_MS,
} from "@/lib/webinar/tokens";
import { sendDemoConfirmationEmail } from "@/lib/demo/send-emails";
import { emailDomain } from "@/lib/demo/provision";

const MAX_NAME = 120;
const MAX_COMPANY = 160;
const MAX_EMAIL = 160;
const MAX_SHORT = 80;
const MAX_NOTE = 2000;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
function cleanStr(x: unknown, max: number): string | null {
  if (typeof x !== "string") return null;
  const t = x.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
}
function cleanOpt(x: unknown, max: number): string | null {
  if (x === undefined || x === null || x === "") return null;
  if (typeof x !== "string") return null;
  const t = x.trim();
  if (t.length === 0) return null;
  if (t.length > max) return null;
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

  const name = cleanStr(b.name, MAX_NAME);
  const company = cleanStr(b.company, MAX_COMPANY);
  const email = cleanStr(b.email, MAX_EMAIL);
  const fleetSize = cleanStr(b.fleetSize, MAX_SHORT);
  const tms = cleanStr(b.tms, MAX_SHORT);
  const phone = cleanOpt(b.phone, MAX_SHORT);
  const note = cleanOpt(b.note, MAX_NOTE);
  const consent = b.consent === true;

  if (!name || !company || !email || !fleetSize || !tms) {
    return bad("missing_fields");
  }
  if (!isEmail(email)) return bad("invalid_email");
  if (!consent) return bad("consent_required");

  const normalizedEmail = email.toLowerCase();
  const domain = emailDomain(normalizedEmail);

  // Silent-OK dedupe: same email with a non-rejected request already exists
  const existing = await db
    .select()
    .from(demoRequests)
    .where(
      and(
        eq(demoRequests.email, normalizedEmail),
        // Any non-rejected status means we already have them in the pipeline
      )
    )
    .all();
  const live = existing.find((r) => r.status !== "rejected");
  if (live) return NextResponse.json({ ok: true });

  const confirmToken = generateConfirmToken();
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(demoRequests).values({
    id: generateId(),
    name,
    company,
    email: normalizedEmail,
    emailDomain: domain,
    phone,
    fleetSize,
    tms,
    note,
    consentAt: new Date().toISOString(),
    status: "pending_confirm",
    confirmToken,
    confirmTokenExpires: expires,
  });

  const origin = new URL(req.url).origin;
  const confirmUrl = `${origin}/demo/confirm?token=${encodeURIComponent(
    confirmToken
  )}`;

  try {
    await sendDemoConfirmationEmail({ to: email, name, confirmUrl });
  } catch (err) {
    console.error("demo confirmation email failed:", err);
    // row is saved; still return ok to avoid leaking provider state
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { webinarSlots } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const { startsAt, endsAt, maxAttendees, isActive, notes, timezone } = body;

  if (!startsAt || !endsAt || typeof maxAttendees !== "number") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (new Date(startsAt) >= new Date(endsAt)) {
    return NextResponse.json({ error: "ends_before_starts" }, { status: 400 });
  }
  if (maxAttendees < 1) {
    return NextResponse.json({ error: "invalid_capacity" }, { status: 400 });
  }

  const id = generateId();
  await db.insert(webinarSlots).values({
    id,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    timezone: typeof timezone === "string" && timezone ? timezone : "Europe/Berlin",
    maxAttendees,
    isActive: isActive !== false,
    notes: typeof notes === "string" ? notes : null,
  });

  return NextResponse.json({ id });
}

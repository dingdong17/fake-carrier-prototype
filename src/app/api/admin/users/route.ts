// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email, name, role } = await req.json();
  if (!email || !name || (role !== "admin" && role !== "broker")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    await db.insert(users).values({
      id: nanoid(),
      email,
      name,
      role,
      clientId: null,
    }).run();
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Insert failed (duplicate email?)",
    }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

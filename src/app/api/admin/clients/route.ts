// src/app/api/admin/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { name, slug, creditBalance, firstUserEmail, firstUserName } = body;
  if (!name || !slug || !firstUserEmail || !firstUserName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  const clientId = nanoid();
  try {
    await db.insert(clients).values({
      id: clientId,
      slug,
      name,
      creditBalance: Number(creditBalance) || 0,
    }).run();
    await db.insert(users).values({
      id: nanoid(),
      email: firstUserEmail,
      name: firstUserName,
      role: "client",
      clientId,
    }).run();
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Insert failed",
    }, { status: 400 });
  }
  return NextResponse.json({ id: clientId, slug });
}

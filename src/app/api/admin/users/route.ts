// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, name, role, clientSlug } = await req.json();
  if (!email || !name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let clientId: string | null = null;
  if (role === "client") {
    if (!clientSlug) {
      return NextResponse.json(
        { error: "clientSlug required for client role" },
        { status: 400 }
      );
    }
    const c = await db
      .select()
      .from(clients)
      .where(eq(clients.slug, clientSlug))
      .get();
    if (!c) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    clientId = c.id;
  } else if (role !== "admin" && role !== "broker") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    await db.insert(users).values({
      id: nanoid(),
      email,
      name,
      role,
      clientId,
    }).run();
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Insert failed (duplicate email?)",
    }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

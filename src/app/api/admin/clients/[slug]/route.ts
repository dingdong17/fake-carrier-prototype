// src/app/api/admin/clients/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { slug } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.creditBalance === "number" && body.creditBalance >= 0) {
    patch.creditBalance = body.creditBalance;
  }
  if (typeof body.name === "string") patch.name = body.name;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }
  await db.update(clients).set(patch).where(eq(clients.slug, slug)).run();
  return NextResponse.json({ success: true });
}

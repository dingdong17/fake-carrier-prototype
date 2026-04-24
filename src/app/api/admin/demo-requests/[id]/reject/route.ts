import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { demoRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendDemoRejectedEmail } from "@/lib/demo/send-emails";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const reason =
    typeof body?.reason === "string" && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 500)
      : null;

  const row = await db
    .select()
    .from(demoRequests)
    .where(eq(demoRequests.id, id))
    .get();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.status === "approved") {
    return NextResponse.json({ error: "already_approved" }, { status: 409 });
  }

  await db
    .update(demoRequests)
    .set({
      status: "rejected",
      reviewedByUserId: session.user.id,
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason,
    })
    .where(eq(demoRequests.id, row.id));

  try {
    await sendDemoRejectedEmail({ to: row.email, name: row.name, reason });
  } catch (err) {
    console.error("demo reject email failed:", err);
  }

  return NextResponse.json({ ok: true });
}

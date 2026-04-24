import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { demoRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { provisionDemoUser } from "@/lib/demo/provision";
import { sendDemoApprovedEmail } from "@/lib/demo/send-emails";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;

  const row = await db
    .select()
    .from(demoRequests)
    .where(eq(demoRequests.id, id))
    .get();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.status === "approved") {
    return NextResponse.json({ ok: true, alreadyApproved: true });
  }
  if (row.status === "rejected") {
    return NextResponse.json({ error: "already_rejected" }, { status: 409 });
  }
  if (row.status === "pending_confirm") {
    return NextResponse.json({ error: "not_yet_confirmed" }, { status: 409 });
  }

  // Provision client + user (reuses existing tenant if email domain matches)
  const { clientId } = await provisionDemoUser({
    email: row.email,
    name: row.name,
    company: row.company,
  });

  await db
    .update(demoRequests)
    .set({
      status: "approved",
      reviewedByUserId: session.user.id,
      reviewedAt: new Date().toISOString(),
      provisionedClientId: clientId,
    })
    .where(eq(demoRequests.id, row.id));

  // Send approval email pointing them at /login. The user then enters their
  // email, Auth.js generates a proper verification token + CSRF-protected
  // callback URL, and our sendMagicLink helper delivers it (it won't deliver
  // to unknown emails — provisionDemoUser just created the row).
  try {
    const origin = new URL(req.url).origin;
    await sendDemoApprovedEmail({
      to: row.email,
      name: row.name,
      loginUrl: `${origin}/login`,
    });
  } catch (err) {
    console.error("demo approved email failed:", err);
  }

  return NextResponse.json({ ok: true, clientId });
}

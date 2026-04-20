import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checks, documents, chatMessages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { rmSync, existsSync } from "fs";
import path from "path";
import { auth } from "@/lib/auth/config";
import { AuthError } from "@/lib/auth/session";
import { requireCheckScope } from "@/lib/auth/scope-check";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      let scope;
      try {
        scope = await requireCheckScope(session.user, id);
      } catch (err) {
        if (err instanceof AuthError) {
          return NextResponse.json({ error: err.message }, { status: 403 });
        }
        return NextResponse.json({ error: err instanceof Error ? err.message : "Not found" }, { status: 404 });
      }
      const { check } = scope;

      const checkDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.checkId, id))
        .all();

      return NextResponse.json({ check, documents: checkDocuments });
    }

    // List mode — filter by scope for client-role users
    if (session.user.role === "client") {
      const clientId = session.user.clientId;
      const allChecks = clientId
        ? await db
            .select()
            .from(checks)
            .where(eq(checks.clientId, clientId))
            .orderBy(desc(checks.createdAt))
            .all()
        : [];
      return NextResponse.json({ checks: allChecks });
    }

    // admin / broker — return all
    const allChecks = await db
      .select()
      .from(checks)
      .orderBy(desc(checks.createdAt))
      .all();

    return NextResponse.json({ checks: allChecks });
  } catch (error) {
    console.error("Checks API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checks" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    let scope;
    try {
      scope = await requireCheckScope(session.user, id);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      return NextResponse.json({ error: err instanceof Error ? err.message : "Not found" }, { status: 404 });
    }
    void scope;

    // Delete related records first (foreign key constraints)
    await db.delete(chatMessages).where(eq(chatMessages.checkId, id)).run();
    await db.delete(documents).where(eq(documents.checkId, id)).run();
    await db.delete(checks).where(eq(checks.id, id)).run();

    // Delete uploaded files
    const uploadDir = path.join(process.cwd(), "uploads", id);
    if (existsSync(uploadDir)) {
      rmSync(uploadDir, { recursive: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete check error:", error);
    return NextResponse.json(
      { error: "Failed to delete check" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backlogItems } from "@/lib/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { generateId, formatBacklogNumber } from "@/lib/utils";
import { auth } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set([
  "ui",
  "ai_chat",
  "ai_analytics",
  "external_api",
  "client_credits",
  "security_rbac",
  "infrastructure",
]);

type Category = "ui" | "ai_chat" | "ai_analytics" | "external_api" |
  "client_credits" | "security_rbac" | "infrastructure";

function parseCategory(
  raw: unknown,
  opts: { allowAbsent: boolean }
): { ok: true; value: Category | null } | { ok: false } {
  if (raw === undefined) {
    return opts.allowAbsent ? { ok: true, value: null } : { ok: false };
  }
  if (raw === null) return { ok: true, value: null };
  if (typeof raw === "string" && VALID_CATEGORIES.has(raw)) {
    return { ok: true, value: raw as Category };
  }
  return { ok: false };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await db
    .select()
    .from(backlogItems)
    .orderBy(asc(backlogItems.sortOrder))
    .all();

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === "create") {
      if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }

      const cat = parseCategory(body.category, { allowAbsent: true });
      if (!cat.ok) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }

      const result = await db
        .select({ maxNum: sql<string>`max(item_number)` })
        .from(backlogItems)
        .get();
      const lastNum = result?.maxNum ? parseInt(result.maxNum.replace("BL-", ""), 10) : 0;
      const seq = (isNaN(lastNum) ? 0 : lastNum) + 1;

      const priority = ((body.priority as string) || "medium") as
        "critical" | "high" | "medium" | "low";

      const item = {
        id: generateId(),
        itemNumber: formatBacklogNumber(seq),
        title: body.title.trim() as string,
        description: (body.description as string) || null,
        priority,
        status: "backlog" as const,
        category: cat.value,
        sortOrder: seq,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.insert(backlogItems).values(item).run();
      return NextResponse.json({ item });
    }

    if (body.action === "update") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "ID is required for update" }, { status: 400 });
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (body.status !== undefined) updates.status = body.status;
      if (body.priority !== undefined) updates.priority = body.priority;
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

      if ("category" in body) {
        const cat = parseCategory(body.category, { allowAbsent: false });
        if (!cat.ok) {
          return NextResponse.json({ error: "Invalid category" }, { status: 400 });
        }
        updates.category = cat.value;
      }

      await db.update(backlogItems)
        .set(updates)
        .where(eq(backlogItems.id, body.id))
        .run();

      return NextResponse.json({ success: true });
    }

    if (body.action === "delete") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "ID is required for delete" }, { status: 400 });
      }
      await db.delete(backlogItems).where(eq(backlogItems.id, body.id)).run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

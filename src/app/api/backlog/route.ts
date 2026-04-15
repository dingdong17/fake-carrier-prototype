import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backlogItems } from "@/lib/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { generateId, formatBacklogNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = db
    .select()
    .from(backlogItems)
    .orderBy(asc(backlogItems.sortOrder))
    .all();

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "create") {
    const count = db
      .select({ count: sql<number>`count(*)` })
      .from(backlogItems)
      .get();
    const seq = (count?.count || 0) + 1;

    const priority = ((body.priority as string) || "medium") as
      "critical" | "high" | "medium" | "low";

    const item = {
      id: generateId(),
      itemNumber: formatBacklogNumber(seq),
      title: body.title as string,
      description: (body.description as string) || null,
      priority,
      status: "backlog" as const,
      sortOrder: seq,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert(backlogItems).values(item).run();

    return NextResponse.json({ item });
  }

  if (body.action === "update") {
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    db.update(backlogItems)
      .set(updates)
      .where(eq(backlogItems.id, body.id))
      .run();

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

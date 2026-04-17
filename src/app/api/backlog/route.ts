import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backlogItems } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { createItem, updateItem } from "@/lib/db/epics";

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
  try {
    const body = await request.json();

    if (body.action === "create") {
      if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
      }
      if (!body.epicId || typeof body.epicId !== "string") {
        return NextResponse.json({ error: "Epic ist erforderlich" }, { status: 400 });
      }
      const priority = ((body.priority as string) || "medium") as
        "critical" | "high" | "medium" | "low";
      const item = createItem(db, {
        title: body.title,
        description: body.description ?? null,
        priority,
        epicId: body.epicId,
      });
      return NextResponse.json({ item });
    }

    if (body.action === "update") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 });
      }
      updateItem(db, {
        id: body.id,
        title: body.title,
        description: body.description,
        priority: body.priority,
        status: body.status,
        sortOrder: body.sortOrder,
        epicId: body.epicId,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interner Fehler";
    const status =
      message.includes("nicht gelöscht") ||
      message.includes("nicht bearbeitet") ||
      message.includes("nicht gefunden")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

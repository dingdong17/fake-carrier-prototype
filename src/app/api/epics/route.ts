import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  listEpicsWithProgress,
  createEpic,
  updateEpic,
  deleteEpic,
} from "@/lib/db/epics";

export const dynamic = "force-dynamic";

export async function GET() {
  const epics = listEpicsWithProgress(db);
  return NextResponse.json({ epics });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "create") {
      if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
      }
      const priority = ((body.priority as string) || "medium") as
        | "critical"
        | "high"
        | "medium"
        | "low";
      const epic = createEpic(db, {
        title: body.title,
        description: body.description ?? null,
        priority,
      });
      return NextResponse.json({ epic });
    }

    if (body.action === "update") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 });
      }
      updateEpic(db, {
        id: body.id,
        title: body.title,
        description: body.description,
        priority: body.priority,
        status: body.status,
        sortOrder: body.sortOrder,
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 });
      }
      deleteEpic(db, body.id);
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = db
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .all();

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const item = {
    id: generateId(),
    checkId: (body.checkId as string) || null,
    category: body.category as "works_well" | "needs_improvement" | "does_not_work",
    comment: (body.comment as string) || "",
    page: (body.page as string) || null,
    createdAt: new Date().toISOString(),
  };

  db.insert(feedback).values(item).run();

  return NextResponse.json({ item });
}

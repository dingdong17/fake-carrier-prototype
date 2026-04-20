import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await db
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .all();

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validCategories = ["works_well", "needs_improvement", "does_not_work"];
    if (!body.category || !validCategories.includes(body.category)) {
      return NextResponse.json({ error: "Valid category is required" }, { status: 400 });
    }

    if (!body.comment || typeof body.comment !== "string" || !body.comment.trim()) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }

    const item = {
      id: generateId(),
      checkId: (body.checkId as string) || null,
      category: body.category as "works_well" | "needs_improvement" | "does_not_work",
      comment: body.comment.trim() as string,
      page: (body.page as string) || null,
      createdAt: new Date().toISOString(),
    };

    await db.insert(feedback).values(item).run();

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

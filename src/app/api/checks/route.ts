import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checks, documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      const check = db
        .select()
        .from(checks)
        .where(eq(checks.id, id))
        .get();

      if (!check) {
        return NextResponse.json(
          { error: "Check not found" },
          { status: 404 }
        );
      }

      const checkDocuments = db
        .select()
        .from(documents)
        .where(eq(documents.checkId, id))
        .all();

      return NextResponse.json({ check, documents: checkDocuments });
    }

    const allChecks = db
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

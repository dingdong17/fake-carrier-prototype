import { NextRequest, NextResponse } from "next/server";
import { validateVatNumber } from "@/lib/analysis/providers/vies-vat";
import { checkWebsiteExists } from "@/lib/analysis/providers/website-check";

export async function POST(request: NextRequest) {
  try {
    const { companyName, vatId, country, website } = await request.json();

    const results: Record<string, unknown> = {};

    // Run checks in parallel
    const checks = [];

    if (vatId) {
      checks.push(
        validateVatNumber(vatId).then((r) => {
          results.vatValidation = r;
        })
      );
    }

    if (companyName) {
      checks.push(
        checkWebsiteExists(companyName, country, website).then((r) => {
          results.websiteCheck = r;
        })
      );
    }

    await Promise.all(checks);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}

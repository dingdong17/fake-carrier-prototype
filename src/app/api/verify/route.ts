import { NextRequest, NextResponse } from "next/server";
import { validateVatNumber } from "@/lib/analysis/providers/vies-vat";
import { checkWebsiteExists } from "@/lib/analysis/providers/website-check";
import { checkDomainAge, extractDomainFromEmail, extractDomainFromUrl } from "@/lib/analysis/providers/domain-check";
import { checkEmail } from "@/lib/analysis/providers/email-check";
import { auth } from "@/lib/auth/config";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const { companyName, vatId, country, website, email } = await request.json();

    const results: Record<string, unknown> = {};
    const checks = [];

    if (vatId) {
      checks.push(
        validateVatNumber(vatId, companyName || undefined).then((r) => {
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

    // Domain age check — from email or website
    const domainToCheck = (email && extractDomainFromEmail(email))
      || (website && extractDomainFromUrl(website))
      || null;
    if (domainToCheck) {
      checks.push(
        checkDomainAge(domainToCheck).then((r) => {
          results.domainCheck = r;
        })
      );
    }

    // Email verification
    if (email) {
      checks.push(
        checkEmail(email, companyName || undefined).then((r) => {
          results.emailCheck = r;
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

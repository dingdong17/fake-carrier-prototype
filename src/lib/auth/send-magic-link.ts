// src/lib/auth/send-magic-link.ts
import { Resend } from "resend";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { allowMagicLinkRequest } from "./rate-limit";
import { isTrustedDomain } from "./entra-tenants";

export async function sendMagicLink(params: {
  identifier: string;
  url: string;
  provider: { from?: string };
}) {
  const { identifier, url } = params;

  // Trusted-domain backstop: covermesh (and later Ecclesia / SCHUNCK) must
  // use Microsoft SSO. The primary gate is in the login form; this catches
  // any direct hit to the NextAuth email-callback endpoint.
  if (isTrustedDomain(identifier)) {
    throw new Error("AccessDenied: trusted domain must use SSO");
  }

  // Rate limit: 5 requests per hour per email. Silent drop on over-limit —
  // same UX as unknown-email enumeration guard below.
  if (!(await allowMagicLinkRequest(identifier))) {
    return;
  }

  const from = process.env.EMAIL_FROM ?? params.provider.from ?? "noreply@example.com";

  // Enumeration guard — do not leak whether the email is provisioned.
  const found = await db
    .select()
    .from(users)
    .where(eq(users.email, identifier))
    .get();

  if (!found) {
    return; // silent — UI always says "check your inbox"
  }

  // Wrap the raw Auth.js callback in a /auth/confirm interstitial to protect
  // the one-time token from email-security / safe-browsing scanners that
  // pre-fetch the link and would otherwise consume it before the human ever
  // clicks.
  const urlObj = new URL(url);
  const confirmUrl = new URL("/auth/confirm", urlObj.origin);
  confirmUrl.searchParams.set("u", urlObj.pathname + urlObj.search);
  const emailLink = confirmUrl.toString();

  const host = urlObj.host;
  const subject = `Ihr Login-Link für ${host}`;
  const text = [
    `Hallo ${found.name ?? ""}`,
    "",
    "Klicken Sie auf den folgenden Link, um sich anzumelden (1 Stunde gültig):",
    "",
    emailLink,
    "",
    "Haben Sie keinen Login angefragt? Dann ignorieren Sie diese E-Mail einfach.",
    "",
    "— FakeCarrier.AI",
  ].join("\n");

  // Dev-stub: if no Resend key configured, log and (best-effort) write a file.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.log("\n=== MAGIC-LINK (dev stub) ===");
    console.log(`to:      ${identifier}`);
    console.log(`subject: ${subject}`);
    console.log(`url:     ${emailLink}`);
    console.log("=============================\n");
    try {
      const dir = path.join(process.cwd(), "tmp");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "last-magic-link.txt"),
        `${new Date().toISOString()} ${identifier}\n${emailLink}\n`,
        "utf8"
      );
    } catch {
      // On Vercel / read-only FS, the file write may fail — the console.log
      // entry is still captured in the runtime logs, which is sufficient.
    }
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: identifier,
    subject,
    text,
  });
  if (error) throw error;
}

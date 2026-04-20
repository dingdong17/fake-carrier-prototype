// src/lib/auth/send-magic-link.ts
import { Resend } from "resend";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { allowMagicLinkRequest } from "./rate-limit";

export async function sendMagicLink(params: {
  identifier: string;
  url: string;
  provider: { from?: string };
}) {
  const { identifier, url } = params;

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

  const host = new URL(url).host;
  const subject = `Ihr Login-Link für ${host}`;
  const text = [
    `Hallo ${found.name ?? ""}`,
    "",
    "Klicken Sie auf den folgenden Link, um sich anzumelden (1 Stunde gültig):",
    "",
    url,
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
    console.log(`url:     ${url}`);
    console.log("=============================\n");
    try {
      const dir = path.join(process.cwd(), "tmp");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "last-magic-link.txt"),
        `${new Date().toISOString()} ${identifier}\n${url}\n`,
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

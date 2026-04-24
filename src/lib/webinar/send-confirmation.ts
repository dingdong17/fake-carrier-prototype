import { Resend } from "resend";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function sendWebinarConfirmationEmail(params: {
  to: string;
  name: string;
  slotLabel: string;
  confirmUrl: string;
}) {
  const { to, name, slotLabel, confirmUrl } = params;
  const from = process.env.EMAIL_FROM ?? "noreply@fakecarrier.ai";
  const subject = "Bitte bestätigen Sie Ihre Webinar-Anmeldung";
  const text = [
    `Hallo ${name},`,
    "",
    `vielen Dank für Ihre Anmeldung zum SCHUNCK FakeCarrier.AI-Webinar am ${slotLabel}.`,
    "",
    "Bitte bestätigen Sie Ihre Anmeldung über den folgenden Link (7 Tage gültig):",
    "",
    confirmUrl,
    "",
    "Nach der Bestätigung erhalten Sie eine separate E-Mail mit Kalendereinladung und Zugangslink.",
    "",
    "Haben Sie sich nicht angemeldet? Dann ignorieren Sie diese E-Mail einfach.",
    "",
    "— SCHUNCK FakeCarrier.AI",
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.log("\n=== WEBINAR-CONFIRM (dev stub) ===");
    console.log(`to:      ${to}`);
    console.log(`subject: ${subject}`);
    console.log(`url:     ${confirmUrl}`);
    console.log("==================================\n");
    try {
      const dir = path.join(process.cwd(), "tmp");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "last-webinar-confirm.txt"),
        `${new Date().toISOString()} ${to}\n${confirmUrl}\n`,
        "utf8"
      );
    } catch {
      // read-only FS on Vercel is fine — console.log is enough
    }
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, text });
  if (error) throw error;
}

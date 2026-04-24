import { Resend } from "resend";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const PRODUCT = "SCHUNCK FakeCarrier.AI";

async function devStub(kind: string, to: string, subject: string, body: string) {
  console.log(`\n=== ${kind} (dev stub) ===`);
  console.log(`to:      ${to}`);
  console.log(`subject: ${subject}`);
  console.log("-- body --");
  console.log(body);
  console.log("=========================\n");
  try {
    const dir = path.join(process.cwd(), "tmp");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, `last-${kind.toLowerCase()}.txt`),
      `${new Date().toISOString()} ${to}\n${subject}\n\n${body}\n`,
      "utf8"
    );
  } catch {
    // read-only FS on Vercel — console.log is enough
  }
}

async function send(to: string, subject: string, text: string, kind: string) {
  const from = process.env.EMAIL_FROM ?? "noreply@fakecarrier.ai";
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    await devStub(kind, to, subject, text);
    return;
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, text });
  if (error) throw error;
}

export async function sendDemoConfirmationEmail(params: {
  to: string;
  name: string;
  confirmUrl: string;
}) {
  const { to, name, confirmUrl } = params;
  const subject = "Bitte bestätigen Sie Ihre Demo-Anfrage";
  const text = [
    `Hallo ${name},`,
    "",
    `vielen Dank für Ihr Interesse an ${PRODUCT}.`,
    "",
    "Bitte bestätigen Sie Ihre Anfrage über den folgenden Link (7 Tage gültig):",
    "",
    confirmUrl,
    "",
    "Nach der Bestätigung prüft unser Team Ihre Anfrage und meldet sich innerhalb von 2 Werktagen.",
    "",
    "Haben Sie keine Anfrage gestellt? Dann ignorieren Sie diese E-Mail einfach.",
    "",
    `— ${PRODUCT}`,
  ].join("\n");
  await send(to, subject, text, "DEMO-CONFIRM");
}

export async function sendDemoAdminNotificationEmail(params: {
  company: string;
  name: string;
  email: string;
  reviewUrl: string;
}) {
  const target = process.env.DEMO_NOTIFICATION_EMAIL;
  if (!target) {
    console.log(
      "[demo] DEMO_NOTIFICATION_EMAIL unset — skipping admin notification"
    );
    return;
  }
  const subject = `Neue Demo-Anfrage: ${params.company}`;
  const text = [
    "Eine neue Demo-Anfrage wurde bestätigt und wartet auf Prüfung:",
    "",
    `Firma:    ${params.company}`,
    `Kontakt:  ${params.name} <${params.email}>`,
    "",
    `Prüfen:   ${params.reviewUrl}`,
    "",
    `— ${PRODUCT}`,
  ].join("\n");
  await send(target, subject, text, "DEMO-ADMIN-NOTIFY");
}

export async function sendDemoApprovedEmail(params: {
  to: string;
  name: string;
  loginUrl: string;
}) {
  const { to, name, loginUrl } = params;
  const subject = "Ihr Demo-Zugang ist freigeschaltet";
  const text = [
    `Hallo ${name},`,
    "",
    `Ihr Demo-Zugang zu ${PRODUCT} ist freigeschaltet.`,
    "",
    "So melden Sie sich an:",
    `1. Öffnen Sie ${loginUrl}`,
    "2. Geben Sie Ihre geschäftliche E-Mail ein",
    '3. Klicken Sie auf „Login-Link anfordern"',
    "4. Öffnen Sie den Link in der E-Mail, die wir Ihnen schicken",
    "",
    "Nach dem ersten Login führt Sie das System direkt in Ihren Demo-Workspace.",
    "",
    `— ${PRODUCT}`,
  ].join("\n");
  await send(to, subject, text, "DEMO-APPROVED");
}

export async function sendDemoRejectedEmail(params: {
  to: string;
  name: string;
  reason: string | null;
}) {
  const { to, name, reason } = params;
  const subject = "Ihre Demo-Anfrage";
  const text = [
    `Hallo ${name},`,
    "",
    `vielen Dank für Ihr Interesse an ${PRODUCT}.`,
    "",
    "Nach Prüfung Ihrer Anfrage können wir Ihnen aktuell leider keinen Demo-Zugang anbieten.",
    reason ? `\nBegründung: ${reason}\n` : "",
    "Gerne können Sie sich zu einem späteren Zeitpunkt erneut anmelden oder einen unserer Webinar-Termine besuchen, um das Produkt kennenzulernen.",
    "",
    `— ${PRODUCT}`,
  ].filter(Boolean).join("\n");
  await send(to, subject, text, "DEMO-REJECTED");
}

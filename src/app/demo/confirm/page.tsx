import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { demoRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isTokenExpired } from "@/lib/webinar/tokens";
import { sendDemoAdminNotificationEmail } from "@/lib/demo/send-emails";
import { APP_NAME } from "@/components/landing/constants";
import { ConfirmTracker } from "@/components/landing/ConfirmTracker";
import { t, type TranslationKey } from "@/i18n";
import "../../landing.css";

export const metadata: Metadata = {
  title: "Demo-Anfrage bestätigen — SCHUNCK FakeCarrier.AI",
  robots: { index: false, follow: false },
};

type ErrorCode = "missing_token" | "invalid_token" | "token_expired";

type State =
  | { kind: "confirmed"; name: string }
  | { kind: "approved"; name: string }
  | { kind: "rejected"; name: string }
  | { kind: "error"; code: ErrorCode };

const ERROR_KEYS: Record<ErrorCode, { title: TranslationKey; body: TranslationKey }> = {
  missing_token: {
    title: "demoConfirm.error.missingToken.title",
    body: "demoConfirm.error.missingToken.body",
  },
  invalid_token: {
    title: "demoConfirm.error.invalidToken.title",
    body: "demoConfirm.error.invalidToken.body",
  },
  token_expired: {
    title: "demoConfirm.error.tokenExpired.title",
    body: "demoConfirm.error.tokenExpired.body",
  },
};

async function confirmByToken(token: string, origin: string): Promise<State> {
  if (!token) return { kind: "error", code: "missing_token" };

  const row = await db
    .select()
    .from(demoRequests)
    .where(eq(demoRequests.confirmToken, token))
    .get();
  if (!row) return { kind: "error", code: "invalid_token" };

  if (row.status === "approved") return { kind: "approved", name: row.name };
  if (row.status === "rejected") return { kind: "rejected", name: row.name };
  if (row.status === "confirmed") return { kind: "confirmed", name: row.name };

  const expiresMs =
    row.confirmTokenExpires instanceof Date
      ? row.confirmTokenExpires.getTime()
      : Number(row.confirmTokenExpires);
  if (isTokenExpired(expiresMs)) {
    return { kind: "error", code: "token_expired" };
  }

  await db
    .update(demoRequests)
    .set({ status: "confirmed", confirmedAt: new Date().toISOString() })
    .where(eq(demoRequests.id, row.id));

  try {
    await sendDemoAdminNotificationEmail({
      company: row.company,
      name: row.name,
      email: row.email,
      reviewUrl: `${origin}/admin/demo-requests/${row.id}`,
    });
  } catch (err) {
    console.error("demo admin notification failed:", err);
  }

  return { kind: "confirmed", name: row.name };
}

export default async function DemoConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3333";
  const origin = base.startsWith("http") ? base : `https://${base}`;
  const state = await confirmByToken(token ?? "", origin);

  return (
    <div className="fc-landing">
      <header className="ec-header">
        <Link href="/" className="ec-brand">
          <Image
            src="/schunck-logo.png"
            alt={t("webinarConfirm.headerBrand")}
            width={120}
            height={30}
            priority
            style={{ height: 30, width: "auto" }}
          />
          <span className="divider" />
          <span className="product">{APP_NAME}</span>
        </Link>
        <div className="ec-head-actions">
          <Link className="btn btn-ghost" href="/">
            {t("webinarConfirm.backToHome")}
          </Link>
        </div>
      </header>
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px" }}>
        {state.kind === "confirmed" && <ConfirmTracker event="demo_confirmed" />}
        {state.kind === "confirmed" && (
          <div className="fc-success" style={{ padding: 0 }}>
            <div className="ic">
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3>{t("demoConfirm.confirmed.title")}</h3>
            <p>{t("demoConfirm.confirmed.body", { name: state.name })}</p>
            <div className="meta">
              <strong>{t("demoConfirm.confirmed.nextTitle")}</strong>
              <br />
              {t("demoConfirm.confirmed.nextBody")}
            </div>
          </div>
        )}

        {state.kind === "approved" && (
          <div className="fc-success" style={{ padding: 0 }}>
            <div className="ic">
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3>{t("demoConfirm.approved.title")}</h3>
            <p>{t("demoConfirm.approved.body", { name: state.name })}</p>
            <div style={{ marginTop: 20 }}>
              <Link className="btn btn-primary" href="/login">
                {t("demoConfirm.approved.loginCta")}
              </Link>
            </div>
          </div>
        )}

        {state.kind === "rejected" && (
          <div className="fc-success" style={{ padding: 0 }}>
            <div
              className="ic"
              style={{ background: "#FDE5E5", color: "#B01B1B" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <h3>{t("demoConfirm.rejected.title")}</h3>
            <p>{t("demoConfirm.rejected.body")}</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="fc-success" style={{ padding: 0 }}>
            <div
              className="ic"
              style={{ background: "#FDE5E5", color: "#B01B1B" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <h3>{t(ERROR_KEYS[state.code].title)}</h3>
            <p>{t(ERROR_KEYS[state.code].body)}</p>
            <div style={{ marginTop: 20 }}>
              <Link className="btn btn-primary" href="/#beta">
                {t("demoConfirm.backToForm")}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

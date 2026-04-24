import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { webinarRegistrations, webinarSlots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isTokenExpired } from "@/lib/webinar/tokens";
import { countConfirmed } from "@/lib/webinar/slots";
import { slotDayLabel, slotTimeLabel } from "@/lib/webinar/format";
import { APP_NAME } from "@/components/landing/constants";
import { ConfirmTracker } from "@/components/landing/ConfirmTracker";
import { t, type TranslationKey } from "@/i18n";
import "../../landing.css";

export const metadata: Metadata = {
  title: "Webinar-Anmeldung bestätigen — SCHUNCK FakeCarrier.AI",
  robots: { index: false, follow: false },
};

type State =
  | { kind: "confirmed"; name: string; slotLabel: string }
  | { kind: "waitlist"; name: string; slotLabel: string }
  | { kind: "error"; code: ErrorCode };

type ErrorCode =
  | "missing_token"
  | "invalid_token"
  | "token_expired"
  | "cancelled"
  | "slot_inactive";

const ERROR_KEYS: Record<ErrorCode, { title: TranslationKey; body: TranslationKey }> = {
  missing_token: {
    title: "webinarConfirm.error.missingToken.title",
    body: "webinarConfirm.error.missingToken.body",
  },
  invalid_token: {
    title: "webinarConfirm.error.invalidToken.title",
    body: "webinarConfirm.error.invalidToken.body",
  },
  token_expired: {
    title: "webinarConfirm.error.tokenExpired.title",
    body: "webinarConfirm.error.tokenExpired.body",
  },
  cancelled: {
    title: "webinarConfirm.error.cancelled.title",
    body: "webinarConfirm.error.cancelled.body",
  },
  slot_inactive: {
    title: "webinarConfirm.error.slotInactive.title",
    body: "webinarConfirm.error.slotInactive.body",
  },
};

async function confirmByToken(token: string): Promise<State> {
  if (!token) return { kind: "error", code: "missing_token" };

  const reg = await db
    .select()
    .from(webinarRegistrations)
    .where(eq(webinarRegistrations.confirmToken, token))
    .get();
  if (!reg) return { kind: "error", code: "invalid_token" };

  const slot = await db
    .select()
    .from(webinarSlots)
    .where(eq(webinarSlots.id, reg.slotId))
    .get();
  const slotLabel = slot
    ? `${slotDayLabel(slot.startsAt)}, ${slotTimeLabel(slot.startsAt, slot.endsAt)}`
    : "—";

  if (reg.status === "confirmed") {
    return { kind: "confirmed", name: reg.name, slotLabel };
  }
  if (reg.status === "waitlist") {
    return { kind: "waitlist", name: reg.name, slotLabel };
  }
  if (reg.status === "cancelled") {
    return { kind: "error", code: "cancelled" };
  }

  const expiresMs =
    reg.confirmTokenExpires instanceof Date
      ? reg.confirmTokenExpires.getTime()
      : Number(reg.confirmTokenExpires);
  if (isTokenExpired(expiresMs)) {
    return { kind: "error", code: "token_expired" };
  }
  if (!slot || !slot.isActive) {
    return { kind: "error", code: "slot_inactive" };
  }

  const confirmedCount = await countConfirmed(reg.slotId);
  const next: "confirmed" | "waitlist" =
    confirmedCount < slot.maxAttendees ? "confirmed" : "waitlist";

  await db
    .update(webinarRegistrations)
    .set({ status: next, confirmedAt: new Date().toISOString() })
    .where(eq(webinarRegistrations.id, reg.id));

  return { kind: next, name: reg.name, slotLabel };
}

export default async function WebinarConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const state = await confirmByToken(token ?? "");

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
      <main
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "80px 24px",
        }}
      >
        {state.kind === "confirmed" && <ConfirmTracker event="webinar_confirmed" />}
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
            <h3>{t("webinarConfirm.confirmed.title")}</h3>
            <p>{t("webinarConfirm.confirmed.body", { name: state.name })}</p>
            <div className="meta">
              <strong>{t("webinarConfirm.confirmed.terminLabel")}</strong>{" "}
              {state.slotLabel}
              <br />
              <strong>{t("webinarConfirm.confirmed.calendarLabel")}</strong>{" "}
              {t("webinarConfirm.confirmed.calendarValue")}
            </div>
          </div>
        )}

        {state.kind === "waitlist" && (
          <div className="fc-success" style={{ padding: 0 }}>
            <div
              className="ic"
              style={{ background: "#FFECE3", color: "#B44000" }}
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
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3>{t("webinarConfirm.waitlist.title")}</h3>
            <p>{t("webinarConfirm.waitlist.body", { name: state.name })}</p>
            <div className="meta">
              <strong>{t("webinarConfirm.waitlist.terminLabel")}</strong>{" "}
              {state.slotLabel}
              <br />
              <strong>{t("webinarConfirm.waitlist.altLabel")}</strong>{" "}
              {t("webinarConfirm.waitlist.altValue")}
            </div>
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
              <Link className="btn btn-primary" href="/#webinar">
                {t("webinarConfirm.backToForm")}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

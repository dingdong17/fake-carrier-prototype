"use client";

import { useState } from "react";
import { APP_NAME } from "./constants";
import type { PublicSlot } from "@/lib/webinar/slots";
import {
  slotDayLabel,
  slotTimeLabel,
  slotDateBadge,
} from "@/lib/webinar/format";
import { t } from "@/i18n";
import { track } from "@/lib/analytics/track";

type Props = {
  slots: PublicSlot[];
};

function seatsLabel(remaining: number, max: number): { text: string; low: boolean } {
  if (remaining === 0) return { text: t("landing.webinar.seatsWaitlist"), low: true };
  const low = remaining <= Math.max(5, Math.ceil(max * 0.2));
  return {
    text: t(
      low ? "landing.webinar.seatsRemainingLow" : "landing.webinar.seatsRemaining",
      { n: remaining }
    ),
    low,
  };
}

export function LandingWebinar({ slots }: Props) {
  const defaultSlot = slots.find((s) => !s.isFull)?.id ?? slots[0]?.id ?? "";
  const [slotId, setSlotId] = useState(defaultSlot);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = slots.find((s) => s.id === slotId);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      slotId: selected.id,
      name: String(fd.get("name") ?? ""),
      company: String(fd.get("company") ?? ""),
      email: String(fd.get("email") ?? ""),
      role: String(fd.get("role") ?? ""),
      consent: fd.get("consent") === "on",
    };
    try {
      const res = await fetch("/api/webinar/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = data?.error ?? "unknown_error";
        setError(code);
        track("webinar_register_submitted", { errorCode: code });
        return;
      }
      setSubmitted(true);
      track("webinar_register_submitted", {
        slotId: selected.id,
        remaining: selected.remaining,
      });
    } catch {
      setError("network_error");
      track("webinar_register_submitted", { errorCode: "network_error" });
    } finally {
      setSubmitting(false);
    }
  };

  const noSlotsEmail = "fakecarrier@schunck.de";
  const consentLinkLabel = t("landing.webinar.card.consentLinkLabel");
  const consentParts = t("landing.webinar.card.consent", {
    link: `<LINK>${consentLinkLabel}</LINK>`,
  }).split(/<LINK>(.*?)<\/LINK>/);

  return (
    <section id="webinar" className="section-ink">
      <div className="inner">
        <div className="fc-webinar-wrap">
          <div>
            <div className="eyebrow">{t("landing.webinar.eyebrow")}</div>
            <h2 style={{ marginBottom: 18 }}>{t("landing.webinar.h2")}</h2>
            <p
              style={{
                color: "rgba(255,255,255,.78)",
                fontSize: 17,
                lineHeight: 1.55,
                maxWidth: "46ch",
                margin: 0,
              }}
            >
              {t("landing.webinar.lead", { appName: APP_NAME })}
            </p>
            <div className="fc-webinar-meta">
              <div className="fc-webinar-meta-row">
                <span className="ic">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </span>
                <div>
                  <div className="t">{t("landing.webinar.meta1Title")}</div>
                  <div className="d">{t("landing.webinar.meta1Body")}</div>
                </div>
              </div>
              <div className="fc-webinar-meta-row">
                <span className="ic">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <div>
                  <div className="t">{t("landing.webinar.meta2Title")}</div>
                  <div className="d">{t("landing.webinar.meta2Body")}</div>
                </div>
              </div>
              <div className="fc-webinar-meta-row">
                <span className="ic">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h10" />
                  </svg>
                </span>
                <div>
                  <div className="t">{t("landing.webinar.meta3Title")}</div>
                  <div className="d">{t("landing.webinar.meta3Body")}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="fc-webinar-card">
            {!submitted ? (
              <>
                <h3>{t("landing.webinar.card.title")}</h3>
                <div className="sub">{t("landing.webinar.card.sub")}</div>
                {slots.length === 0 ? (
                  <div
                    style={{
                      background: "#FFECE3",
                      color: "#B44000",
                      padding: "14px 16px",
                      borderRadius: 10,
                      fontSize: 14,
                      marginBottom: 16,
                    }}
                  >
                    {t("landing.webinar.card.noSlots", {
                      email: noSlotsEmail,
                    })
                      .split(noSlotsEmail)
                      .flatMap((part, i, arr) =>
                        i < arr.length - 1
                          ? [
                              part,
                              <a key={i} href={`mailto:${noSlotsEmail}`}>
                                {noSlotsEmail}
                              </a>,
                            ]
                          : [part]
                      )}
                  </div>
                ) : (
                  <div
                    className="fc-slots"
                    role="radiogroup"
                    aria-label="Termin wählen"
                  >
                    {slots.map((s) => {
                      const badge = slotDateBadge(s.startsAt);
                      const day = slotDayLabel(s.startsAt);
                      const time = slotTimeLabel(s.startsAt, s.endsAt);
                      const seats = seatsLabel(s.remaining, s.maxAttendees);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => setSlotId(s.id)}
                          className={`fc-slot${slotId === s.id ? " selected" : ""}`}
                          role="radio"
                          aria-checked={slotId === s.id}
                        >
                          <div className="date">
                            <div className="m">{badge.m}</div>
                            <div className="d">{badge.d}</div>
                          </div>
                          <div className="info">
                            <div className="day">{day}</div>
                            <div className="time">{time}</div>
                            <div
                              className={`seats${seats.low ? " low" : ""}`}
                              style={{ marginTop: 4 }}
                            >
                              {seats.text}
                            </div>
                          </div>
                          <div className="radio" />
                        </button>
                      );
                    })}
                  </div>
                )}
                <form onSubmit={submit}>
                  <div className="fc-form-row">
                    <div className="fc-field">
                      <label>{t("landing.webinar.card.nameLabel")}</label>
                      <input
                        name="name"
                        required
                        placeholder={t("landing.webinar.card.namePlaceholder")}
                      />
                    </div>
                    <div className="fc-field">
                      <label>{t("landing.webinar.card.companyLabel")}</label>
                      <input
                        name="company"
                        required
                        placeholder={t("landing.webinar.card.companyPlaceholder")}
                      />
                    </div>
                  </div>
                  <div className="fc-form-row">
                    <div className="fc-field">
                      <label>{t("landing.webinar.card.emailLabel")}</label>
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder={t("landing.webinar.card.emailPlaceholder")}
                      />
                    </div>
                    <div className="fc-field">
                      <label>{t("landing.webinar.card.roleLabel")}</label>
                      <select name="role" defaultValue={t("landing.webinar.card.roles.disposition")}>
                        <option>{t("landing.webinar.card.roles.disposition")}</option>
                        <option>{t("landing.webinar.card.roles.fleet")}</option>
                        <option>{t("landing.webinar.card.roles.ceo")}</option>
                        <option>{t("landing.webinar.card.roles.compliance")}</option>
                        <option>{t("landing.webinar.card.roles.insurance")}</option>
                        <option>{t("landing.webinar.card.roles.other")}</option>
                      </select>
                    </div>
                  </div>
                  <label className="fc-check">
                    <input name="consent" type="checkbox" required />
                    <span>
                      {consentParts[0]}
                      <a href="#">{consentParts[1]}</a>
                      {consentParts[2]}
                    </span>
                  </label>
                  {error && (
                    <div
                      style={{
                        background: "#FDE5E5",
                        color: "#B01B1B",
                        padding: "10px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      {t("landing.webinar.card.errorFallback", { code: error })}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || slots.length === 0}
                    className="btn btn-primary btn-lg"
                    style={{ width: "100%", opacity: submitting ? 0.6 : 1 }}
                  >
                    {submitting
                      ? t("landing.webinar.card.submitting")
                      : t("landing.webinar.card.submit")}
                  </button>
                </form>
              </>
            ) : (
              <div className="fc-success">
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
                <h3>{t("landing.webinar.card.success.title")}</h3>
                <p>{t("landing.webinar.card.success.body")}</p>
                {selected && (
                  <div className="meta">
                    <strong>{t("landing.webinar.card.success.wishTermin")}</strong>{" "}
                    {slotDayLabel(selected.startsAt)},{" "}
                    {slotTimeLabel(selected.startsAt, selected.endsAt)}
                    <br />
                    {t("landing.webinar.card.success.linkValidity")}
                  </div>
                )}
                <div style={{ marginTop: 20 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setSubmitted(false)}
                  >
                    {t("landing.webinar.card.success.anotherSlot")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

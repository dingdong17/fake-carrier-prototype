"use client";

import { useState } from "react";
import { APP_NAME } from "./constants";
import { t } from "@/i18n";
import { track } from "@/lib/analytics/track";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const PERKS = [1, 2, 3, 4] as const;

export function LandingBeta() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") ?? ""),
      company: String(fd.get("company") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      fleetSize: String(fd.get("fleetSize") ?? ""),
      tms: String(fd.get("tms") ?? ""),
      note: String(fd.get("note") ?? ""),
      consent: fd.get("consent") === "on",
    };
    try {
      const res = await fetch("/api/demo/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = data?.error ?? "unknown_error";
        setError(code);
        track("demo_register_submitted", { errorCode: code });
        return;
      }
      setSent(true);
      track("demo_register_submitted");
    } catch {
      setError("network_error");
      track("demo_register_submitted", { errorCode: "network_error" });
    } finally {
      setSubmitting(false);
    }
  };

  const consentLinkLabel = t("landing.beta.card.consentLinkLabel");
  const consentParts = t("landing.beta.card.consent", {
    link: `<LINK>${consentLinkLabel}</LINK>`,
  }).split(/<LINK>(.*?)<\/LINK>/);

  return (
    <section id="beta" className="section">
      <div className="fc-beta">
        <div>
          <div className="eyebrow">{t("landing.beta.eyebrow")}</div>
          <h2
            style={{
              fontSize: "clamp(32px, 3.8vw, 48px)",
              maxWidth: "16ch",
              margin: "0 0 18px",
              letterSpacing: "-0.01em",
            }}
          >
            {t("landing.beta.h2")}
          </h2>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: "var(--fg-2)",
              maxWidth: "46ch",
            }}
          >
            {t("landing.beta.lead", { appName: APP_NAME })}
          </p>
          <ul className="fc-beta-perks">
            {PERKS.map((n) => (
              <li key={n}>
                <span className="ic">
                  <CheckIcon />
                </span>
                <span>
                  <strong>{t(`landing.beta.perk${n}.strong` as const)}</strong>{" "}
                  {t(`landing.beta.perk${n}.body` as const)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="fc-beta-card">
          {!sent ? (
            <>
              <div className="fc-beta-badge">
                <span className="dot" /> {t("landing.beta.card.badge")}
              </div>
              <h3>{t("landing.beta.card.title")}</h3>
              <div className="sub">{t("landing.beta.card.sub")}</div>
              <form onSubmit={submit}>
                <div className="fc-form-row">
                  <div className="fc-field">
                    <label>{t("landing.beta.card.nameLabel")}</label>
                    <input
                      name="name"
                      required
                      placeholder={t("landing.beta.card.namePlaceholder")}
                    />
                  </div>
                  <div className="fc-field">
                    <label>{t("landing.beta.card.companyLabel")}</label>
                    <input
                      name="company"
                      required
                      placeholder={t("landing.beta.card.companyPlaceholder")}
                    />
                  </div>
                </div>
                <div className="fc-form-row">
                  <div className="fc-field">
                    <label>{t("landing.beta.card.emailLabel")}</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder={t("landing.beta.card.emailPlaceholder")}
                    />
                  </div>
                  <div className="fc-field">
                    <label>{t("landing.beta.card.phoneLabel")}</label>
                    <input
                      name="phone"
                      type="tel"
                      placeholder={t("landing.beta.card.phonePlaceholder")}
                    />
                  </div>
                </div>
                <div className="fc-form-row">
                  <div className="fc-field">
                    <label>{t("landing.beta.card.fleetLabel")}</label>
                    <select name="fleetSize" defaultValue={t("landing.beta.card.fleet.r50_200")}>
                      <option>{t("landing.beta.card.fleet.lt50")}</option>
                      <option>{t("landing.beta.card.fleet.r50_200")}</option>
                      <option>{t("landing.beta.card.fleet.r200_500")}</option>
                      <option>{t("landing.beta.card.fleet.gt500")}</option>
                      <option>{t("landing.beta.card.fleet.none")}</option>
                    </select>
                  </div>
                  <div className="fc-field">
                    <label>{t("landing.beta.card.tmsLabel")}</label>
                    <select name="tms" defaultValue={t("landing.beta.card.tms.timocom")}>
                      <option>{t("landing.beta.card.tms.timocom")}</option>
                      <option>{t("landing.beta.card.tms.carlo")}</option>
                      <option>{t("landing.beta.card.tms.transporeon")}</option>
                      <option>{t("landing.beta.card.tms.saptm")}</option>
                      <option>{t("landing.beta.card.tms.custom")}</option>
                      <option>{t("landing.beta.card.tms.other")}</option>
                    </select>
                  </div>
                </div>
                <div className="fc-field" style={{ marginBottom: 12 }}>
                  <label>{t("landing.beta.card.noteLabel")}</label>
                  <textarea
                    name="note"
                    rows={3}
                    placeholder={t("landing.beta.card.notePlaceholder")}
                  />
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
                    {t("landing.beta.card.errorFallback", { code: error })}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-ink btn-lg"
                  style={{ width: "100%", opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting
                    ? t("landing.beta.card.submitting")
                    : t("landing.beta.card.submit")}
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
              <h3>{t("landing.beta.card.success.title")}</h3>
              <p>{t("landing.beta.card.success.body")}</p>
              <div className="meta">
                <strong>{t("landing.beta.card.success.nextTitle")}</strong>
                <br />
                {t("landing.beta.card.success.next1")}
                <br />
                {t("landing.beta.card.success.next2")}
                <br />
                {t("landing.beta.card.success.next3")}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

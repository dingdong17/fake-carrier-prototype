import { APP_NAME } from "./constants";
import { t } from "@/i18n";
import { TrackedAnchor, TrackedLink } from "./ClientTrackers";

export function LandingHero() {
  return (
    <section className="fc-hero">
      <div className="fc-hero-inner">
        <div>
          <div className="eyebrow">{t("landing.hero.eyebrow")}</div>
          <h1>
            {t("landing.hero.h1Prefix")}
            <span className="accent">{t("landing.hero.h1Accent")}</span>
            {t("landing.hero.h1Suffix")}
          </h1>
          <p className="lead">{t("landing.hero.lead", { appName: APP_NAME })}</p>
          <div className="fc-hero-ctas">
            <TrackedAnchor
              href="#webinar"
              event="hero_webinar_cta_click"
              className="btn btn-mint btn-lg"
            >
              {t("landing.hero.primaryCta")}
            </TrackedAnchor>
            <TrackedAnchor
              href="#beta"
              event="hero_beta_cta_click"
              className="btn btn-ghost-inv btn-lg"
            >
              {t("landing.hero.secondaryCta")}
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
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </TrackedAnchor>
          </div>
          <div className="fc-hero-login">
            {t("landing.hero.loginPrompt")}{" "}
            <TrackedLink href="/login" event="hero_login_cta_click">
              {t("landing.hero.loginCta")}
            </TrackedLink>
          </div>
          <div className="fc-hero-meta">
            <span>
              <span className="dot" />
              {t("landing.hero.metaSlots")}
            </span>
            <span>
              <span className="dot" />
              {t("landing.hero.metaFree")}
            </span>
          </div>
        </div>
        <div className="fc-mock">
          <div className="fc-mock-badge">{t("landing.hero.mock.liveDemo")}</div>
          <div className="fc-mock-chrome">
            <div className="dots">
              <i />
              <i />
              <i />
            </div>
            <div className="url">
              fake-carrier.schunck.de / pruefung / FC-2026-0417
            </div>
          </div>
          <div className="fc-mock-body">
            <div className="fc-mock-row">
              <div>
                <div className="fc-mock-title">{t("landing.hero.mock.title")}</div>
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                  {t("landing.hero.mock.meta")}
                </div>
              </div>
              <span className="fc-mock-pill err">{t("landing.hero.mock.unverified")}</span>
            </div>
            <div className="fc-mock-grid">
              <div className="fc-mock-kv">
                <div className="k">{t("landing.hero.mock.firmaLabel")}</div>
                <div className="v">{t("landing.hero.mock.firmaValue")}</div>
              </div>
              <div className="fc-mock-kv">
                <div className="k">{t("landing.hero.mock.lizenzLabel")}</div>
                <div className="v">{t("landing.hero.mock.lizenzValue")}</div>
              </div>
              <div className="fc-mock-kv">
                <div className="k">{t("landing.hero.mock.fahrzeugLabel")}</div>
                <div className="v">{t("landing.hero.mock.fahrzeugValue")}</div>
              </div>
              <div className="fc-mock-kv">
                <div className="k">{t("landing.hero.mock.kontaktLabel")}</div>
                <div className="v">{t("landing.hero.mock.kontaktValue")}</div>
              </div>
            </div>
            <div className="fc-mock-checks">
              <div className="fc-mock-check">
                <span className="ic ok">✓</span>
                {t("landing.hero.mock.checkOk")}
              </div>
              <div className="fc-mock-check">
                <span className="ic err">!</span>
                {t("landing.hero.mock.checkErr1")}
              </div>
              <div className="fc-mock-check">
                <span className="ic err">!</span>
                {t("landing.hero.mock.checkErr2")}
              </div>
              <div className="fc-mock-check">
                <span className="ic warn">·</span>
                {t("landing.hero.mock.checkWarn")}
              </div>
            </div>
            <div className="fc-mock-alert">
              <strong>{t("landing.hero.mock.alertLabel")}</strong>&nbsp;
              {t("landing.hero.mock.alertBody")}
            </div>
          </div>
        </div>
      </div>
      <div className="fc-trust-strip">
        <span className="label">{t("landing.hero.trustLabel")}</span>
        <div className="fc-trust-logos">
          <span>BGL</span>
          <span>DSLV</span>
          <span>TimoCom</span>
          <span>Bundesamt für Güterverkehr</span>
          <span>VdS Schadenverhütung</span>
        </div>
      </div>
    </section>
  );
}

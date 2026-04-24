import { APP_NAME } from "./constants";
import { t } from "@/i18n";

const STEPS = [
  { n: 1, titleKey: "landing.solution.step1Title", bodyKey: "landing.solution.step1Body" },
  { n: 2, titleKey: "landing.solution.step2Title", bodyKey: "landing.solution.step2Body" },
  { n: 3, titleKey: "landing.solution.step3Title", bodyKey: "landing.solution.step3Body" },
  { n: 4, titleKey: "landing.solution.step4Title", bodyKey: "landing.solution.step4Body" },
] as const;

const DEMO_CHECKS = [
  { variant: "ok", tKey: "landing.solution.demo.check1", vKey: "landing.solution.demo.check1Meta" },
  { variant: "ok", tKey: "landing.solution.demo.check2", vKey: "landing.solution.demo.check2Meta" },
  { variant: "warn", tKey: "landing.solution.demo.check3", vKey: "landing.solution.demo.check3Meta" },
  { variant: "ok", tKey: "landing.solution.demo.check4", vKey: "landing.solution.demo.check4Meta" },
  { variant: "ok", tKey: "landing.solution.demo.check5", vKey: "landing.solution.demo.check5Meta" },
] as const;

export function LandingSolution() {
  return (
    <section id="loesung" className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">{t("landing.solution.eyebrow")}</div>
          <h2>{t("landing.solution.h2")}</h2>
        </div>
        <p className="sub">{t("landing.solution.sub", { appName: APP_NAME })}</p>
      </div>

      <div className="fc-solution">
        <ol className="fc-steps">
          {STEPS.map((s) => (
            <li className="fc-step" key={s.n}>
              <div className="num">{s.n}</div>
              <div>
                <h4>{t(s.titleKey)}</h4>
                <p>{t(s.bodyKey, { appName: APP_NAME })}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="fc-demo-card">
          <div className="fc-demo-header">
            <div className="t">
              {t("landing.solution.demo.headerTitle")}
              <small>{t("landing.solution.demo.headerSub")}</small>
            </div>
            <span className="fc-mock-pill ok">{t("landing.solution.demo.badge")}</span>
          </div>
          <div className="fc-demo-body">
            <div className="fc-demo-upload">
              <div style={{ marginBottom: 8, fontSize: 22 }}>↥</div>
              <strong>{t("landing.solution.demo.uploadTitle")}</strong>
              <div style={{ marginTop: 6 }}>{t("landing.solution.demo.uploadSub")}</div>
            </div>
            <div className="fc-demo-stage">
              {DEMO_CHECKS.map((c) => (
                <div className={`fc-demo-check ${c.variant}`} key={c.tKey}>
                  <span className="ic">{c.variant === "warn" ? "!" : "✓"}</span>
                  <span className="t">{t(c.tKey)}</span>
                  <span className="v">{t(c.vKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fc-features">
        <div className="fc-feature">
          <div className="ic">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h3>{t("landing.solution.feat1Title")}</h3>
          <p>{t("landing.solution.feat1Body")}</p>
        </div>
        <div className="fc-feature">
          <div className="ic">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18" />
              <path d="M8 14h5" />
            </svg>
          </div>
          <h3>{t("landing.solution.feat2Title")}</h3>
          <p>{t("landing.solution.feat2Body")}</p>
        </div>
        <div className="fc-feature">
          <div className="ic">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="m4.93 4.93 2.83 2.83" />
              <path d="m16.24 16.24 2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="m4.93 19.07 2.83-2.83" />
              <path d="m16.24 7.76 2.83-2.83" />
            </svg>
          </div>
          <h3>{t("landing.solution.feat3Title")}</h3>
          <p>{t("landing.solution.feat3Body", { appName: APP_NAME })}</p>
        </div>
      </div>
    </section>
  );
}

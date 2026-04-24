import { APP_NAME } from "./constants";
import { t } from "@/i18n";

const STATS = [
  { n: "1,2", u: " Mrd. €", labelKey: "landing.problem.stat1Label", src: "TAPA EMEA, 2025" },
  { n: "+43", u: " %", labelKey: "landing.problem.stat2Label", src: "BGL Lagebericht" },
  { n: "78", u: " %", labelKey: "landing.problem.stat3Label", src: "Europol OC-THREAT" },
  { n: "14", u: " Min.", labelKey: "landing.problem.stat4Label", src: "interne Messung" },
] as const;

const STEPS = [
  { labelKey: "landing.problem.step1Label", titleKey: "landing.problem.step1Title", bodyKey: "landing.problem.step1Body", final: false },
  { labelKey: "landing.problem.step2Label", titleKey: "landing.problem.step2Title", bodyKey: "landing.problem.step2Body", final: false },
  { labelKey: "landing.problem.step3Label", titleKey: "landing.problem.step3Title", bodyKey: "landing.problem.step3Body", final: true },
] as const;

export function LandingProblem() {
  return (
    <section id="problem" className="section-tint">
      <div className="inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">{t("landing.problem.eyebrow")}</div>
            <h2>{t("landing.problem.h2")}</h2>
          </div>
          <p className="sub">{t("landing.problem.sub")}</p>
        </div>

        <div className="fc-problem-grid">
          {STATS.map((s) => (
            <div className="fc-stat" key={s.labelKey}>
              <div className="num">
                {s.n}
                <span className="unit">{s.u}</span>
              </div>
              <div className="label">{t(s.labelKey, { appName: APP_NAME })}</div>
              <div className="source">
                {t("landing.problem.sourcePrefix")} {s.src}
              </div>
            </div>
          ))}
        </div>

        <div className="fc-scenario">
          {STEPS.map((s) => (
            <div
              className={`fc-scenario-step${s.final ? " final" : ""}`}
              key={s.titleKey}
            >
              <div className="n">{t(s.labelKey)}</div>
              <h4>{t(s.titleKey)}</h4>
              <p>{t(s.bodyKey)}</p>
              <div className="timeline" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

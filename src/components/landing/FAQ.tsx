"use client";

import { useState } from "react";
import { APP_NAME } from "./constants";
import { t, tList } from "@/i18n";

type FAQEntry = { q: string; a: string };

function interpolate(s: string): string {
  return s.replace(/\{appName\}/g, APP_NAME);
}

export function LandingFAQ() {
  const [open, setOpen] = useState(0);
  const items = tList<FAQEntry>("landing.faq.items");
  const subEmail = "fakecarrier@schunck.de";
  const subRaw = t("landing.faq.sub", { email: `<LINK>${subEmail}</LINK>` });
  const subParts = subRaw.split(/<LINK>(.*?)<\/LINK>/);
  return (
    <section id="faq" className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">{t("landing.faq.eyebrow")}</div>
          <h2>{t("landing.faq.h2")}</h2>
        </div>
        <p className="sub">
          {subParts[0]}
          <a
            href={`mailto:${subEmail}`}
            style={{ color: "var(--ec-lichtblau)", textDecoration: "underline" }}
          >
            {subParts[1]}
          </a>
          {subParts[2]}
        </p>
      </div>
      <div className="fc-faq">
        {items.map((it, i) => (
          <div
            key={it.q}
            className={`fc-faq-item${open === i ? " open" : ""}`}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <div className="fc-faq-q">
              <span>{interpolate(it.q)}</span>
              <span className="plus">+</span>
            </div>
            <div className="fc-faq-a">{interpolate(it.a)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

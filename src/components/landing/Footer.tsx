import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "./constants";
import { t, tList } from "@/i18n";

const NAV_LINKS: Array<{ key: "problem" | "solution" | "webinar" | "beta" | "faq"; href: string }> = [
  { key: "problem", href: "#problem" },
  { key: "solution", href: "#loesung" },
  { key: "webinar", href: "#webinar" },
  { key: "beta", href: "#beta" },
  { key: "faq", href: "#faq" },
];

export function LandingFooter() {
  const col2Heading = t("landing.footer.col2Heading");
  const col3Heading = t("landing.footer.col3Heading");
  const col2Items = tList<string>("landing.footer.col2Items");
  const col3Items = tList<string>("landing.footer.col3Items");
  return (
    <footer className="fc-footer">
      <div className="fc-footer-top">
        <div className="fc-footer-brand">
          <Image
            src="/schunck-logo.png"
            alt="SCHUNCK GROUP"
            width={140}
            height={32}
            style={{ height: 32, width: "auto", filter: "brightness(0) invert(1)" }}
          />
          <p>{t("landing.footer.brandDescription", { appName: APP_NAME })}</p>
        </div>
        <div className="fc-footer-col">
          <div className="fc-footer-h">{APP_NAME}</div>
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{t(`landing.header.nav.${l.key}` as const)}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="fc-footer-col">
          <div className="fc-footer-h">{col2Heading}</div>
          <ul>
            {col2Items.map((i) => (
              <li key={i}>
                <a href="#">{i}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="fc-footer-col">
          <div className="fc-footer-h">{col3Heading}</div>
          <ul>
            {col3Items.map((i) => (
              <li key={i}>
                <a href="#">{i}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="fc-footer-bottom">
        <span>{t("landing.footer.copyright", { appName: APP_NAME })}</span>
        <span className="fc-footer-legal">
          <Link href="/impressum">{t("landing.footer.legal.impressum")}</Link>
          <Link href="/datenschutz">{t("landing.footer.legal.datenschutz")}</Link>
          <Link href="/agb">{t("landing.footer.legal.agb")}</Link>
        </span>
      </div>
    </footer>
  );
}

import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "./constants";
import { t } from "@/i18n";
import { HeaderActions } from "./ClientTrackers";

const NAV_KEYS: Array<{ key: "problem" | "solution" | "webinar" | "beta" | "faq"; href: string }> = [
  { key: "problem", href: "#problem" },
  { key: "solution", href: "#loesung" },
  { key: "webinar", href: "#webinar" },
  { key: "beta", href: "#beta" },
  { key: "faq", href: "#faq" },
];

export function LandingHeader() {
  return (
    <header className="ec-header">
      <Link href="#" className="ec-brand">
        <Image
          src="/schunck-logo.png"
          alt="SCHUNCK GROUP"
          width={120}
          height={30}
          priority
          style={{ height: 30, width: "auto" }}
        />
        <span className="divider" />
        <span className="product">{APP_NAME}</span>
      </Link>
      <nav className="ec-nav">
        {NAV_KEYS.map((l) => (
          <a key={l.href} href={l.href}>
            {t(`landing.header.nav.${l.key}` as const)}
          </a>
        ))}
      </nav>
      <HeaderActions />
    </header>
  );
}

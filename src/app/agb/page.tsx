import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/components/landing/constants";
import "../landing.css";

export const metadata: Metadata = {
  title: "AGB — SCHUNCK FakeCarrier.AI",
  robots: { index: true, follow: false },
};

export default function AgbPage() {
  return (
    <div className="fc-landing">
      <header className="ec-header">
        <Link href="/" className="ec-brand">
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
        <div className="ec-head-actions">
          <Link className="btn btn-ghost" href="/">
            Zur Startseite
          </Link>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontSize: "clamp(32px, 3.8vw, 44px)", marginBottom: 24 }}>
          Allgemeine Geschäftsbedingungen
        </h1>
        <div
          style={{
            background: "#FFECE3",
            color: "#B44000",
            padding: "14px 16px",
            borderRadius: 10,
            fontSize: 14,
            marginBottom: 32,
          }}
        >
          <strong>Platzhalter.</strong> Für die geschlossene Beta gelten noch
          keine regulären AGB. Bei der Freischaltung Ihres Demo-Zugangs
          erhalten Sie eine individuelle Beta-Vereinbarung. Der finale
          AGB-Text wird von der Rechtsabteilung der SCHUNCK GROUP geliefert,
          sobald das Produkt in den regulären Vertrieb übergeht.
        </div>
        <section style={{ lineHeight: 1.6, fontSize: 16, color: "var(--fg-2)" }}>
          <p>
            Bis dahin gelten die AGB der SCHUNCK GROUP entsprechend, soweit
            anwendbar. Fragen bitte per E-Mail an{" "}
            <a href="mailto:fakecarrier@schunck.de">fakecarrier@schunck.de</a>.
          </p>
        </section>
      </main>
    </div>
  );
}

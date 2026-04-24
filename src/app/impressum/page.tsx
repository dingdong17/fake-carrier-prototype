import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/components/landing/constants";
import "../landing.css";

export const metadata: Metadata = {
  title: "Impressum — SCHUNCK FakeCarrier.AI",
  robots: { index: true, follow: false },
};

export default function ImpressumPage() {
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
          Impressum
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
          <strong>Platzhalter.</strong> Der finale Impressumstext wird von der
          Rechtsabteilung der SCHUNCK GROUP geliefert.
        </div>
        <section style={{ lineHeight: 1.6, fontSize: 16, color: "var(--fg-2)" }}>
          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            Angaben gemäß § 5 TMG
          </h2>
          <p>
            SCHUNCK GROUP GmbH &amp; Co KG
            <br />
            — Teil der Ecclesia Gruppe —
            <br />
            Detmold, Deutschland
          </p>

          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            Kontakt
          </h2>
          <p>
            E-Mail:{" "}
            <a href="mailto:fakecarrier@schunck.de">fakecarrier@schunck.de</a>
            <br />
            Telefon: +49 5231 603-0
          </p>

          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            Verantwortlich für den Inhalt
          </h2>
          <p>Inhalt folgt.</p>

          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            Haftungsausschluss
          </h2>
          <p>Inhalt folgt.</p>
        </section>
      </main>
    </div>
  );
}

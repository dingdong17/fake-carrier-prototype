import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/components/landing/constants";
import "../landing.css";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — SCHUNCK FakeCarrier.AI",
  robots: { index: true, follow: false },
};

export default function DatenschutzPage() {
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
          Datenschutzerklärung
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
          <strong>Platzhalter.</strong> Der finale Datenschutztext wird von der
          Rechtsabteilung der SCHUNCK GROUP geliefert. Die folgenden Absätze
          fassen zusammen, welche Daten wir aktuell auf dieser Landing-Page
          erheben — als Grundlage für die finale Fassung.
        </div>
        <section style={{ lineHeight: 1.6, fontSize: 16, color: "var(--fg-2)" }}>
          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            1. Formulardaten
          </h2>
          <p>
            Beim Absenden der Webinar- oder Beta-Anfrage verarbeiten wir Name,
            Unternehmen, E-Mail-Adresse, ggf. Telefonnummer, Rolle, Flottengröße
            und TMS sowie optionale Freitextangaben. Die Daten werden
            ausschließlich zur Bearbeitung Ihrer Anfrage und — im Fall des
            Webinars — zur Organisation des Termins verwendet.
          </p>

          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            2. Double-Opt-In
          </h2>
          <p>
            Nach Absenden der Anfrage senden wir Ihnen eine Bestätigungs-E-Mail.
            Erst nach Klick auf den Bestätigungslink wird Ihre Anfrage
            weiterverarbeitet. Der Bestätigungslink ist 7 Tage gültig.
          </p>

          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            3. Hosting &amp; Speicherort
          </h2>
          <p>
            Die Anwendung läuft auf Vercel (Frankfurt), die Datenbank wird von
            Turso bereitgestellt.
          </p>

          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            4. Analytics
          </h2>
          <p>
            Wir erheben anonyme Ereignis-Statistiken (z.&nbsp;B. Aufrufe der
            Landing-Page, Klicks auf Primärbuttons, Formularabsendungen) ohne
            Verknüpfung zu personenbezogenen Daten und ohne Drittanbieter-Cookies.
          </p>

          <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>
            5. Ihre Rechte
          </h2>
          <p>
            Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung
            und Widerspruch. Wenden Sie sich dafür an{" "}
            <a href="mailto:fakecarrier@schunck.de">fakecarrier@schunck.de</a>.
          </p>
        </section>
      </main>
    </div>
  );
}

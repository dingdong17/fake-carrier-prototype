import type { Metadata } from "next";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { LandingHeader } from "@/components/landing/Header";
import { LandingHero } from "@/components/landing/Hero";
import { LandingProblem } from "@/components/landing/Problem";
import { LandingSolution } from "@/components/landing/Solution";
import { LandingWebinar } from "@/components/landing/Webinar";
import { LandingBeta } from "@/components/landing/Beta";
import { LandingFAQ } from "@/components/landing/FAQ";
import { LandingFooter } from "@/components/landing/Footer";
import { LandingMount } from "@/components/landing/ClientTrackers";
import { listActiveSlots } from "@/lib/webinar/slots";
import "./landing.css";

const SITE_TITLE =
  "SCHUNCK FakeCarrier.AI — Phantom-Spediteure stoppen, bevor sie Ihre Ladung stehlen";
const SITE_DESCRIPTION =
  "KI-gestützte Frachtführer-Prüfung für deutsche Speditionen: Lizenz, Fahrzeug, Versicherung und digitale Präsenz in 45 Sekunden. Kostenfreies Webinar + Beta-Zugang.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "de_DE",
    siteName: "SCHUNCK FakeCarrier.AI",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === "admin") redirect("/admin");
    if (session.user.role === "broker") redirect("/broker");
    if (session.user.role === "client" && session.user.clientSlug) {
      redirect(`/client/${session.user.clientSlug}`);
    }
  }

  const slots = await listActiveSlots();

  return (
    <div className="fc-landing">
      <LandingMount />
      <LandingHeader />
      <LandingHero />
      <LandingProblem />
      <LandingSolution />
      <LandingWebinar slots={slots} />
      <LandingBeta />
      <LandingFAQ />
      <LandingFooter />
    </div>
  );
}

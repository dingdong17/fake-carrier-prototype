import type { Metadata } from "next";
import { BrandProvider } from "@/components/brand-provider";
import { NavigationBlockerProvider } from "@/lib/navigation-blocker";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCHUNCK FakeCarrier.AI — Phantom-Spediteure stoppen",
  description:
    "SCHUNCK FakeCarrier.AI prüft in 45 Sekunden, ob ein Frachtführer echt ist — für die deutsche Logistikbranche. Webinar und Beta-Zugang.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <BrandProvider>
            <NavigationBlockerProvider>{children}</NavigationBlockerProvider>
          </BrandProvider>
        </Providers>
      </body>
    </html>
  );
}

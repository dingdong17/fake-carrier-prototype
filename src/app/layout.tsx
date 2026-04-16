import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BrandProvider } from "@/components/brand-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frachtführer-Prüfung",
  description: "KI-gestützte Prüfung von Frachtführern zur Betrugsprävention",
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
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--brand-background)", fontFamily: "var(--brand-font-body)" }}>
        <BrandProvider>
          <Header />
          <main className="mx-auto w-full max-w-[1304px] flex-1 px-6 py-8">
            {children}
          </main>
          <Footer />
        </BrandProvider>
      </body>
    </html>
  );
}

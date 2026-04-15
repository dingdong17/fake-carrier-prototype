import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frachtf\u00fchrer-Pr\u00fcfung | Ecclesia Gruppe",
  description: "KI-gest\u00fctzte Pr\u00fcfung von Frachtf\u00fchrern zur Betrugspr\u00e4vention",
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
      <body className="min-h-screen bg-ec-light-grey font-inter">
        {children}
      </body>
    </html>
  );
}

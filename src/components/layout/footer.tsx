"use client";

import { useBrand } from "@/components/brand-provider";

export function Footer() {
  const { brand } = useBrand();

  return (
    <footer className="border-t py-4" style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-surface)" }}>
      <div className="mx-auto max-w-[1304px] px-6 text-center text-xs" style={{ color: "var(--brand-text-muted)" }}>
        <p>Automatisierte Vorprüfung — keine Rechtsberatung</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} {brand.name}</p>
      </div>
    </footer>
  );
}

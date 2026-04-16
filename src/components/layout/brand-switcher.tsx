"use client";

import { useBrand } from "@/components/brand-provider";
import { BRANDS } from "@/lib/config/brands";

export function BrandSwitcher() {
  const { brandId, switchBrand } = useBrand();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-0.5">
      {Object.values(BRANDS).map((b) => (
        <button
          key={b.id}
          onClick={() => switchBrand(b.id)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            brandId === b.id
              ? "bg-[var(--brand-primary)] text-white"
              : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-border-light)]"
          }`}
          title={`Wechseln zu ${b.name}`}
        >
          {b.id === "ecclesia" ? "EC" : "SC"}
        </button>
      ))}
    </div>
  );
}

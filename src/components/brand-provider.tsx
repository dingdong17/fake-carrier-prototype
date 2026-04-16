"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BRANDS, DEFAULT_BRAND, type BrandConfig } from "@/lib/config/brands";

interface BrandContextType {
  brand: BrandConfig;
  brandId: string;
  switchBrand: (id: string) => void;
}

const BrandContext = createContext<BrandContextType>({
  brand: BRANDS[DEFAULT_BRAND],
  brandId: DEFAULT_BRAND,
  switchBrand: () => {},
});

export function useBrand() {
  return useContext(BrandContext);
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brandId, setBrandId] = useState(DEFAULT_BRAND);
  const brand = BRANDS[brandId] || BRANDS[DEFAULT_BRAND];

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("fakecarrier-brand");
    if (saved && BRANDS[saved]) {
      setBrandId(saved);
    }
  }, []);

  // Apply CSS custom properties when brand changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", brand.colors.primary);
    root.style.setProperty("--brand-primary-hover", brand.colors.primaryHover);
    root.style.setProperty("--brand-accent", brand.colors.accent);
    root.style.setProperty("--brand-accent-hover", brand.colors.accentHover);
    root.style.setProperty("--brand-text", brand.colors.text);
    root.style.setProperty("--brand-text-muted", brand.colors.textMuted);
    root.style.setProperty("--brand-border", brand.colors.border);
    root.style.setProperty("--brand-border-light", brand.colors.borderLight);
    root.style.setProperty("--brand-background", brand.colors.background);
    root.style.setProperty("--brand-surface", brand.colors.surface);
    root.style.setProperty("--brand-error", brand.colors.error);
    root.style.setProperty("--brand-warning", brand.colors.warning);
    root.style.setProperty("--brand-info", brand.colors.info);
    root.style.setProperty("--brand-success", brand.colors.success);
    root.style.setProperty("--brand-red", brand.colors.red);
    root.style.setProperty("--brand-yellow", brand.colors.yellow);
    root.style.setProperty("--brand-font-heading", brand.fontHeading);
    root.style.setProperty("--brand-font-body", brand.fontBody);
    root.style.setProperty("--brand-radius", brand.borderRadius);
  }, [brand]);

  const switchBrand = useCallback((id: string) => {
    if (BRANDS[id]) {
      setBrandId(id);
      localStorage.setItem("fakecarrier-brand", id);
    }
  }, []);

  return (
    <BrandContext.Provider value={{ brand, brandId, switchBrand }}>
      {children}
    </BrandContext.Provider>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "./nav-links";
import { BrandSwitcher } from "./brand-switcher";
import { useBrand } from "@/components/brand-provider";

export function Header() {
  const { brand } = useBrand();

  return (
    <header className="border-b bg-[var(--brand-surface)]" style={{ borderColor: "var(--brand-border)" }}>
      <div className="mx-auto flex h-16 max-w-[1304px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={brand.logo}
            alt={brand.name}
            width={28}
            height={28}
            className="mr-1"
            priority
          />
          <span className="hidden text-lg font-semibold sm:inline" style={{ color: "var(--brand-primary)", fontFamily: "var(--brand-font-heading)" }}>
            Frachtführer-Prüfung
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <NavLinks />
          <BrandSwitcher />
        </div>
      </div>
    </header>
  );
}

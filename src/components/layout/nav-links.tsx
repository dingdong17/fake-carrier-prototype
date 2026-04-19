"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { useNavigationBlockerState } from "@/lib/navigation-blocker";

const links = [
  { href: "/", label: "Start" },
  { href: "/check", label: "Neue Prüfung" },
  { href: "/history", label: "Verlauf" },
  { href: "/checks-catalog", label: "Prüfkatalog" },
  { href: "/backlog", label: "Backlog" },
  { href: "/feedback", label: "Feedback" },
];

export function NavLinks() {
  const pathname = usePathname();
  const { isBlocked, requestNavigation } = useNavigationBlockerState();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!isBlocked) return;
    if (pathname === href) return;
    e.preventDefault();
    requestNavigation(href);
  };

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={(e) => handleClick(e, link.href)}
            className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={
              isActive
                ? { backgroundColor: "var(--brand-primary)", color: "#fff" }
                : { color: "var(--brand-text)" }
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Start" },
  { href: "/check", label: "Neue Prüfung" },
  { href: "/history", label: "Verlauf" },
  { href: "/backlog", label: "Dev ToDos" },
  { href: "/feedback", label: "Feedback" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
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

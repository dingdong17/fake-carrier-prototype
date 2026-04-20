"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { useSession } from "next-auth/react";
import { useNavigationBlockerState } from "@/lib/navigation-blocker";

type Role = "admin" | "broker" | "client";
type LinkDef = { href: string; label: string; roles: Role[] };

const LINKS: LinkDef[] = [
  { href: "/admin", label: "Admin", roles: ["admin"] },
  { href: "/broker", label: "Broker-Start", roles: ["admin", "broker"] },
  { href: "/neue-pruefung", label: "Neue Prüfung", roles: ["admin", "broker", "client"] },
  { href: "/checks-catalog", label: "Prüfkatalog", roles: ["admin", "broker", "client"] },
];

export function NavLinks() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const { isBlocked, requestNavigation } = useNavigationBlockerState();

  // Anonymous (no session) — show no links. Header will still render the logo.
  if (!role) return null;

  const links = LINKS.filter((l) => l.roles.includes(role));

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    const samePath = pathname === href;

    if (samePath && href === "/neue-pruefung") {
      e.preventDefault();
      const ok = window.confirm(
        "Neue Prüfung starten? Alle bisher eingegebenen Daten gehen verloren."
      );
      if (!ok) return;
      window.location.assign("/neue-pruefung");
      return;
    }

    if (samePath) return;
    if (!isBlocked) return;
    e.preventDefault();
    requestNavigation(href);
  };

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(link.href + "/");
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

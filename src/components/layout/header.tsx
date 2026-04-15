import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "./nav-links";

export function Header() {
  return (
    <header className="border-b border-ec-medium-grey bg-white">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ecclesia-logo.svg"
            alt="Ecclesia Gruppe"
            width={140}
            height={32}
            priority
          />
          <span className="hidden font-barlow text-lg font-semibold text-ec-dark-blue sm:inline">
            Frachtführer-Prüfung
          </span>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}

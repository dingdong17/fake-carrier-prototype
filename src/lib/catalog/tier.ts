import type { Tier } from "./checks";

const ORDER: Record<Tier, number> = { quick: 1, medium: 2, full: 3 };

export function isInTier(selectedTier: Tier, checkAvailability: Tier): boolean {
  return ORDER[selectedTier] >= ORDER[checkAvailability];
}

export const TIER_LABELS: Record<Tier, string> = {
  quick: "Schnell",
  medium: "Standard",
  full: "Vollständig",
};

export const TIER_DESCRIPTIONS: Record<Tier, string> = {
  quick:
    "Ca. 10 Sekunden. Kernprüfungen: VAT, Dokumenttyp-Erkennung, forensische Metadaten.",
  medium:
    "Ca. 30 Sekunden. Empfohlen. Zusätzlich: KI-Extraktion, dokumentübergreifende Konsistenz.",
  full: "1-2 Minuten. Alles — inkl. künftiger langsamer OSINT-Prüfungen.",
};

export const DEFAULT_TIER: Tier = "medium";

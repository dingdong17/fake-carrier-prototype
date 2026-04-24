import { de } from "./de";
import type { Dict } from "./de";

// Active dictionary. A locale switcher would swap this; for now the site is
// German-only and a full next-intl migration is tracked as a separate BL.
const dict: Dict = de;

/** Recursive keys: "landing.hero.h1Accent", etc. Arrays are opaque (access via t()). */
type Paths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : T extends readonly (infer _U)[]
    ? Prefix
    : T extends object
      ? {
          [K in keyof T & string]: Paths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
        }[keyof T & string]
      : never;

export type TranslationKey = Paths<Dict>;

type Vars = Record<string, string | number>;

function walk(path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] === undefined ? `{${k}}` : String(vars[k])
  );
}

/** Lookup a translation string. Returns the key itself on miss (visible in dev). */
export function t(key: TranslationKey, vars?: Vars): string {
  const v = walk(key);
  if (typeof v !== "string") {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] missing string key: ${key}`);
    }
    return key;
  }
  return interpolate(v, vars);
}

/**
 * Lookup an array of strings (FAQ items, list perks, etc.). Returns []  on miss.
 * Interpolation is applied to every string leaf, including nested objects.
 */
export function tList<T = unknown>(key: string): T[] {
  const v = walk(key);
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Re-export so components can read the raw dictionary when typed tree-walk is needed. */
export { de } from "./de";
export type { Dict } from "./de";

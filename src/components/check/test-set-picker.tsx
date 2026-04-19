"use client";

import { useMemo } from "react";
import type { Tier } from "@/lib/catalog/checks";
import { CHECK_CATALOG } from "@/lib/catalog/checks";
import { isInTier, TIER_LABELS, TIER_DESCRIPTIONS } from "@/lib/catalog/tier";

interface TestSetPickerProps {
  value: Tier;
  onChange: (tier: Tier) => void;
}

const TIERS: Tier[] = ["quick", "medium", "full"];

export function TestSetPicker({ value, onChange }: TestSetPickerProps) {
  const counts = useMemo(() => {
    const result: Record<Tier, number> = { quick: 0, medium: 0, full: 0 };
    for (const t of TIERS) {
      result[t] = CHECK_CATALOG.filter((c) => isInTier(t, c.availability)).length;
    }
    return result;
  }, []);

  return (
    <fieldset className="rounded-xl border border-ec-medium-grey bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-ec-grey-80">
        Prüftiefe
      </legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {TIERS.map((t) => {
          const active = value === t;
          return (
            <label
              key={t}
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                active
                  ? "border-ec-dark-blue bg-ec-dark-blue/5 ring-2 ring-ec-dark-blue/20"
                  : "border-ec-medium-grey hover:border-ec-grey-60"
              }`}
            >
              <input
                type="radio"
                name="test-set"
                value={t}
                checked={active}
                onChange={() => onChange(t)}
                className="sr-only"
              />
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-ec-grey-80">
                    {TIER_LABELS[t]}
                  </div>
                  <div className="mt-0.5 text-xs text-ec-grey-70">
                    {counts[t]} Prüfungen
                  </div>
                </div>
                <span
                  className={`h-4 w-4 rounded-full border ${
                    active
                      ? "border-ec-dark-blue bg-ec-dark-blue"
                      : "border-ec-grey-60 bg-white"
                  }`}
                  aria-hidden
                />
              </div>
              <p className="mt-2 text-xs text-ec-grey-70">
                {TIER_DESCRIPTIONS[t]}
              </p>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ec-grey-70">
        Details zu jeder Prüfung im{" "}
        <a href="/checks-catalog" className="underline" target="_blank">
          Prüfkatalog
        </a>
        .
      </p>
    </fieldset>
  );
}

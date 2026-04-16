interface GuidanceItem {
  tier: "ai_verified" | "human_required" | "outside_scope";
  labelDe: string;
  description: string;
  action?: string;
}

interface GuidanceTierProps {
  guidance: GuidanceItem[];
}

const tierConfig: Record<
  GuidanceItem["tier"],
  { label: string; bg: string; border: string; iconBg: string; iconColor: string }
> = {
  ai_verified: {
    label: "Automatisch geprüft",
    bg: "bg-ec-dark-blue/5",
    border: "border-ec-dark-blue/20",
    iconBg: "bg-ec-dark-blue/10",
    iconColor: "text-ec-dark-blue",
  },
  human_required: {
    label: "Ihre Aktion erforderlich",
    bg: "bg-ec-warning/5",
    border: "border-ec-warning/20",
    iconBg: "bg-ec-warning/10",
    iconColor: "text-ec-warning",
  },
  outside_scope: {
    label: "Außerhalb der Prüfmöglichkeit",
    bg: "bg-ec-grey-40/50",
    border: "border-ec-grey-60",
    iconBg: "bg-ec-grey-60",
    iconColor: "text-ec-grey-70",
  },
};

function TierIcon({ tier }: { tier: GuidanceItem["tier"] }) {
  if (tier === "ai_verified") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  if (tier === "human_required") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

export function GuidanceTier({ guidance }: GuidanceTierProps) {
  const tiers: GuidanceItem["tier"][] = ["ai_verified", "human_required", "outside_scope"];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold font-barlow" style={{ color: "var(--brand-text)" }}>
        {`Pr\u00fcfungsumfang`}
      </h3>
      {tiers.map((tier) => {
        const items = guidance.filter((g) => g.tier === tier);
        if (items.length === 0) return null;
        const cfg = tierConfig[tier];

        return (
          <div key={tier} className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full ${cfg.iconBg} ${cfg.iconColor}`}>
                <TierIcon tier={tier} />
              </div>
              <h4 className="text-sm font-semibold text-ec-grey-80">{cfg.label}</h4>
            </div>
            <ul className="space-y-2 ml-9">
              {items.map((item, i) => (
                <li key={i} className="text-sm">
                  <span className="text-ec-grey-80">{item.description}</span>
                  {item.action && (
                    <span className="block text-ec-grey-70 mt-0.5 italic">{item.action}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

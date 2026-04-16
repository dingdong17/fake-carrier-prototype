interface RecommendationBannerProps {
  recommendation: "approve" | "review" | "warning" | "reject";
  explanation: string;
  riskScore: number;
  confidenceLevel: number;
}

const config: Record<
  RecommendationBannerProps["recommendation"],
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  approve: {
    label: "FREIGEBEN",
    bg: "bg-ec-dark-green/10",
    text: "text-ec-dark-green",
    border: "border-ec-dark-green/30",
    icon: "\u2713",
  },
  review: {
    label: "PRÜFEN",
    bg: "bg-ec-yellow/15",
    text: "text-yellow-700",
    border: "border-ec-yellow/40",
    icon: "\u26A0",
  },
  warning: {
    label: "WARNUNG",
    bg: "bg-ec-red/10",
    text: "text-ec-red",
    border: "border-ec-red/30",
    icon: "\u26A0",
  },
  reject: {
    label: "ABLEHNEN",
    bg: "bg-ec-error/10",
    text: "text-ec-error",
    border: "border-ec-error/30",
    icon: "\u2717",
  },
};

export function RecommendationBanner({
  recommendation,
  explanation,
  riskScore,
  confidenceLevel,
}: RecommendationBannerProps) {
  const c = config[recommendation];

  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-6`}>
      <div className="flex items-start gap-4">
        <span className={`text-3xl ${c.text}`}>{c.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-xl font-bold font-barlow tracking-wide ${c.text}`}>
              {c.label}
            </span>
            <span className="text-sm text-ec-grey-70">
              Risikoscore: {riskScore.toFixed(0)} | Vertrauensniveau: {confidenceLevel.toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-ec-grey-80 leading-relaxed">{explanation}</p>
        </div>
      </div>
    </div>
  );
}

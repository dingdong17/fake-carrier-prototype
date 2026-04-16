interface RecommendationBannerProps {
  recommendation: "approve" | "review" | "warning" | "reject";
  explanation: string;
  riskScore: number;
  confidenceLevel: number;
}

interface ActionAdvice {
  text: string;
  icon: string;
}

function getActionAdvice(
  recommendation: string,
  riskScore: number,
  confidenceLevel: number
): ActionAdvice[] {
  const advice: ActionAdvice[] = [];

  if (recommendation === "approve" && confidenceLevel >= 60) {
    advice.push({
      icon: "\u2705",
      text: "Auftragsvergabe kann erfolgen. Dokumentieren Sie die durchgef\u00fchrte Pr\u00fcfung.",
    });
    if (confidenceLevel < 80) {
      advice.push({
        icon: "\u{1F4CB}",
        text: "Empfehlung: Vor erstmaliger Zusammenarbeit telefonisch Kontakt zum Firmensitz aufnehmen.",
      });
    }
  }

  if (recommendation === "review") {
    if (riskScore <= 30 && confidenceLevel < 60) {
      advice.push({
        icon: "\u{1F4DD}",
        text: "Geringes Risiko, aber wenig Daten. Fordern Sie weitere Dokumente an, um das Vertrauensniveau zu erh\u00f6hen.",
      });
    }
    if (riskScore > 30) {
      advice.push({
        icon: "\u{1F6E1}",
        text: "Holen Sie eine schriftliche Freigabe Ihres Vorgesetzten ein, bevor Sie den Auftrag vergeben.",
      });
    }
    advice.push({
      icon: "\u260E",
      text: "Rufen Sie den Frachtf\u00fchrer unter der Festnetznummer am Firmensitz an und verifizieren Sie die Angaben m\u00fcndlich.",
    });
    advice.push({
      icon: "\u{1F4C4}",
      text: "Versicherungsschutz direkt beim Versicherer telefonisch best\u00e4tigen lassen.",
    });
  }

  if (recommendation === "warning") {
    advice.push({
      icon: "\u26D4",
      text: "Auftragsvergabe wird nicht empfohlen. Falls dennoch erw\u00fcnscht: Schriftliche Genehmigung der Gesch\u00e4ftsleitung einholen.",
    });
    advice.push({
      icon: "\u{1F4CB}",
      text: "Alle fehlenden Dokumente anfordern und vollst\u00e4ndig pr\u00fcfen, bevor eine Entscheidung getroffen wird.",
    });
    advice.push({
      icon: "\u{1F6A8}",
      text: "Vier-Augen-Prinzip anwenden: Zweite Person muss die Pr\u00fcfung unabh\u00e4ngig best\u00e4tigen.",
    });
  }

  if (recommendation === "reject") {
    advice.push({
      icon: "\u{1F6AB}",
      text: "Keine Auftragsvergabe. Die Risikoindikatoren deuten auf einen m\u00f6glichen Betrugsversuch hin.",
    });
    advice.push({
      icon: "\u{1F6A8}",
      text: "Melden Sie den Vorfall intern an Ihre Compliance-Abteilung und informieren Sie ggf. die Plattform (z.B. TIMOCOM).",
    });
    advice.push({
      icon: "\u{1F4BE}",
      text: "Sichern Sie alle vorliegenden Dokumente und die Kommunikation als Beweismittel.",
    });
  }

  // Universal advice based on confidence
  if (confidenceLevel < 40 && recommendation !== "reject") {
    advice.push({
      icon: "\u{1F4C2}",
      text: "Vertrauensniveau unter 40%: Laden Sie weitere Dokumente hoch, um eine zuverl\u00e4ssigere Bewertung zu erhalten.",
    });
  }

  return advice;
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
    label: "PR\u00dcFEN",
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
  const advice = getActionAdvice(recommendation, riskScore, confidenceLevel);

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

          {advice.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-current/10 pt-3">
              <p className="text-xs font-semibold uppercase text-ec-grey-70">Handlungsempfehlung</p>
              {advice.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-base leading-5 flex-shrink-0">{a.icon}</span>
                  <span className="text-sm text-ec-grey-80">{a.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

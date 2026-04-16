interface NextStepsProps {
  steps: string[];
}

export function NextSteps({ steps }: NextStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-lg border border-ec-dark-blue/20 bg-ec-dark-blue/5 p-4">
      <h4 className="text-sm font-semibold text-ec-dark-blue mb-3">Nächste Schritte</h4>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ec-dark-blue text-white text-xs font-bold">
              {i + 1}
            </span>
            <span className="text-sm text-ec-grey-80 leading-relaxed pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

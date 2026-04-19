interface ProgressBarProps {
  currentStep: number;
}

const steps = [
  { number: 1, label: "Daten erfassen" },
  { number: 2, label: "Kontextfragen" },
  { number: 3, label: "Analyse" },
  { number: 4, label: "Ergebnis" },
];

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <nav aria-label="Fortschritt" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isUpcoming = step.number > currentStep;

          return (
            <li
              key={step.number}
              className="flex flex-1 items-center last:flex-none"
            >
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isCompleted
                      ? "bg-ec-mint text-ec-dark-blue"
                      : isCurrent
                        ? "bg-ec-dark-blue text-white"
                        : "bg-ec-grey-40 text-ec-grey-70"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs text-center whitespace-nowrap ${
                    isCompleted || isCurrent
                      ? "text-ec-dark-blue font-medium"
                      : "text-ec-grey-70"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 mt-[-1.25rem] h-0.5 flex-1 ${
                    step.number < currentStep
                      ? "bg-ec-mint"
                      : isUpcoming
                        ? "bg-ec-grey-40"
                        : "bg-ec-dark-blue"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

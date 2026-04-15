"use client";

import { useState } from "react";

interface FeedbackPromptProps {
  checkId: string;
}

const categories = [
  {
    id: "works_well" as const,
    label: "Funktioniert gut",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21H7V10l4-8 1 1v4h2z" />
      </svg>
    ),
    selectedColor: "bg-green-100 border-green-500 text-green-700",
    hoverColor: "hover:bg-green-50",
  },
  {
    id: "needs_improvement" as const,
    label: "Verbesserungsbedarf",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    selectedColor: "bg-yellow-100 border-yellow-500 text-yellow-700",
    hoverColor: "hover:bg-yellow-50",
  },
  {
    id: "does_not_work" as const,
    label: "Funktioniert nicht",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    selectedColor: "bg-red-100 border-red-500 text-red-700",
    hoverColor: "hover:bg-red-50",
  },
];

export function FeedbackPrompt({ checkId }: FeedbackPromptProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkId,
        category: selected,
        comment,
        page: "results",
      }),
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-center text-sm font-medium text-green-700">
        Vielen Dank für Ihr Feedback!
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-ec-grey-80 mb-4 font-barlow">
        Wie war diese Prüfung?
      </p>
      <div className="flex gap-3 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelected(cat.id)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              selected === cat.id
                ? cat.selectedColor
                : `border-ec-medium-grey text-ec-grey-70 ${cat.hoverColor}`
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>
      {selected && (
        <div className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optionaler Kommentar..."
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-grey-80 placeholder:text-ec-grey-60 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
            rows={3}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white hover:bg-ec-dark-blue/90 transition-colors"
          >
            Absenden
          </button>
        </div>
      )}
    </div>
  );
}

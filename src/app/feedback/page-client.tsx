"use client";

import { useEffect, useState } from "react";

interface FeedbackItem {
  id: string;
  checkId: string | null;
  category: "works_well" | "needs_improvement" | "does_not_work";
  comment: string;
  page: string | null;
  createdAt: string;
}

const catConfig: Record<string, { label: string; color: string }> = {
  works_well: { label: "Funktioniert gut", color: "bg-green-100 text-green-700" },
  needs_improvement: { label: "Verbesserungsbedarf", color: "bg-yellow-100 text-yellow-700" },
  does_not_work: { label: "Funktioniert nicht", color: "bg-red-100 text-red-700" },
};

export default function FeedbackPageClient() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feedback")
      .then((res) => res.json())
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, []);

  const convertToBacklog = async (item: FeedbackItem) => {
    await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title: `[Feedback] ${item.comment.substring(0, 60)}`,
        description: `Aus Feedback konvertiert (${catConfig[item.category]?.label}): ${item.comment}`,
        priority: item.category === "does_not_work" ? "high" : "medium",
      }),
    });
    alert("Als Backlog-Eintrag erstellt!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ec-light-grey flex items-center justify-center">
        <div className="text-ec-grey-70">Feedback wird geladen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ec-light-grey">
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold font-barlow text-ec-grey-80 mb-6">
          Feedback
        </h1>

        {items.length === 0 ? (
          <div className="rounded-xl border border-ec-medium-grey bg-white p-8 text-center text-sm text-ec-grey-70">
            Noch kein Feedback eingegangen.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const config = catConfig[item.category];
              const date = new Date(item.createdAt).toLocaleDateString("de-DE", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-ec-medium-grey bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${config?.color}`}
                        >
                          {config?.label}
                        </span>
                        {item.page && (
                          <span className="text-xs text-ec-grey-60">
                            Seite: {item.page}
                          </span>
                        )}
                      </div>
                      {item.comment && (
                        <p className="text-sm text-ec-grey-80 mb-2">
                          {item.comment}
                        </p>
                      )}
                      <p className="text-xs text-ec-grey-60">{date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => convertToBacklog(item)}
                      className="shrink-0 rounded-lg border border-ec-dark-blue px-3 py-1.5 text-xs font-medium text-ec-dark-blue hover:bg-ec-dark-blue/5 transition-colors"
                    >
                      &rarr; Backlog
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

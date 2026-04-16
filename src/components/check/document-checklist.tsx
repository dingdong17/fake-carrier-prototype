"use client";

import { Badge } from "@/components/ui/badge";

export interface ChecklistItem {
  id: string;
  labelDe: string;
  checked: boolean;
  autoDetected: boolean;
  details?: string;
}

interface DocumentChecklistProps {
  items: ChecklistItem[];
}

export function DocumentChecklist({ items }: DocumentChecklistProps) {
  if (items.length === 0) return null;

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase text-ec-grey-70">
          Prüfstatus
        </h3>
        <Badge variant={checkedCount === items.length ? "success" : checkedCount > 0 ? "info" : "neutral"}>
          {checkedCount} / {items.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
              item.checked
                ? "border-ec-success/20 bg-ec-success/5"
                : "border-ec-grey-60 bg-white"
            }`}
          >
            <div
              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${
                item.checked
                  ? "bg-ec-success text-white"
                  : "border-2 border-ec-grey-60"
              }`}
            >
              {item.checked && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${item.checked ? "text-ec-grey-80" : "text-ec-grey-70"}`}>
                  {item.labelDe}
                </span>
                {item.autoDetected && (
                  <Badge variant="info">KI erkannt</Badge>
                )}
              </div>
              {item.details && (
                <p className="mt-0.5 text-xs text-ec-grey-70">{item.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

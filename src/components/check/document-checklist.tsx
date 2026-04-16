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
    <div className="space-y-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-ec-grey-70">
          Prüfstatus
        </h3>
        <Badge variant={checkedCount === items.length ? "success" : checkedCount > 0 ? "info" : "neutral"}>
          {checkedCount}/{items.length}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
              item.checked
                ? "border-ec-success/20 bg-ec-success/5"
                : "border-ec-grey-60/50 bg-white"
            }`}
          >
            <div
              className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${
                item.checked
                  ? "bg-ec-success text-white"
                  : "border border-ec-grey-60"
              }`}
            >
              {item.checked && (
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className={`block text-xs leading-tight ${item.checked ? "font-medium text-ec-grey-80" : "text-ec-grey-70"}`}>
                {item.labelDe}
              </span>
              {item.autoDetected && (
                <span className="mt-0.5 inline-block text-[10px] font-medium text-ec-info">
                  KI erkannt
                </span>
              )}
              {item.details && (
                <p className="mt-0.5 truncate text-[10px] text-ec-grey-70">{item.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

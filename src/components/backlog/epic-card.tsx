"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface EpicCardProps {
  epic: {
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: "critical" | "high" | "medium" | "low";
    status: "backlog" | "in_progress" | "done";
    isProtected: number;
    progress: { total: number; done: number; inProgress: number };
  };
  onDelete: (id: string) => void;
}

const priorityLabel: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

const statusLabel: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Arbeit",
  done: "Erledigt",
};

export function EpicCard({ epic, onDelete }: EpicCardProps) {
  const pct =
    epic.progress.total === 0
      ? 0
      : Math.round((epic.progress.done / epic.progress.total) * 100);

  return (
    <div className="flex flex-col rounded-xl border border-ec-medium-grey bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-xs text-ec-grey-80">{epic.itemNumber}</span>
          <h3 className="font-barlow text-base font-semibold text-ec-dark-blue">
            {epic.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={epic.priority}>
            {priorityLabel[epic.priority] || epic.priority}
          </Badge>
          <span className="text-[10px] uppercase tracking-wide text-ec-grey-80">
            {statusLabel[epic.status]}
          </span>
        </div>
      </div>

      {epic.description && (
        <p className="mb-3 text-xs text-ec-grey-80">{epic.description}</p>
      )}

      <div className="mb-1 flex items-center justify-between text-xs text-ec-grey-80">
        <span>
          {epic.progress.done}/{epic.progress.total} erledigt
          {epic.progress.inProgress > 0 && ` · ${epic.progress.inProgress} in Arbeit`}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-ec-light-grey">
        <div
          className="h-full bg-ec-dark-blue transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-auto flex items-center justify-between">
        <Link
          href={`/backlog?epic=${epic.itemNumber}`}
          className="text-xs font-medium text-ec-dark-blue hover:underline"
        >
          Öffnen →
        </Link>
        {epic.isProtected === 1 ? (
          <span className="text-[10px] uppercase tracking-wide text-ec-grey-80">
            Geschützt
          </span>
        ) : (
          <button
            onClick={() => {
              if (confirm(`Epic ${epic.itemNumber} löschen? Items wandern zu Orphans.`)) {
                onDelete(epic.id);
              }
            }}
            className="text-xs text-ec-red hover:underline"
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}

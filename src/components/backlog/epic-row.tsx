"use client";

import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "./kanban-card";
import type { EpicRow as EpicRowData, Status } from "@/lib/backlog/grouping";

interface EpicRowProps {
  row: EpicRowData;
  collapsed: boolean;
  hoveredCell: string | null;
  justDragged: React.MutableRefObject<boolean>;
  onToggleCollapse: (epicId: string) => void;
  onAddItem: (epicId: string) => void;
  onCardDragStart: (e: React.DragEvent, id: string) => void;
  onCardDragEnd: () => void;
  onCardClick: (id: string) => void;
  onCellDragOver: (cellKey: string, e: React.DragEvent) => void;
  onCellDragLeave: (cellKey: string) => void;
  onCellDrop: (epicId: string, status: Status) => void;
}

const priorityLabel: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

const STATUSES: Status[] = ["backlog", "in_progress", "done"];

export function EpicRow({
  row,
  collapsed,
  hoveredCell,
  justDragged,
  onToggleCollapse,
  onAddItem,
  onCardDragStart,
  onCardDragEnd,
  onCardClick,
  onCellDragOver,
  onCellDragLeave,
  onCellDrop,
}: EpicRowProps) {
  const pct =
    row.total === 0 ? 0 : Math.round((row.counts.done / row.total) * 100);

  const isOrphans = row.epic.isProtected === 1;
  const header = (
    <div
      className={`flex flex-col justify-between gap-1 rounded-lg border p-3 ${
        isOrphans
          ? "border-ec-grey-60 bg-ec-light-grey"
          : "border-ec-medium-grey bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggleCollapse(row.epic.id)}
          className="rounded px-1 text-ec-grey-80 hover:bg-ec-medium-grey"
          aria-label={collapsed ? "Aufklappen" : "Zuklappen"}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <span className="font-mono text-xs text-ec-grey-80">{row.epic.itemNumber}</span>
        {isOrphans && (
          <span className="rounded-full bg-ec-medium-grey px-2 py-0.5 text-[9px] uppercase tracking-wide text-ec-grey-80">
            Geschützt
          </span>
        )}
        <button
          type="button"
          onClick={() => onAddItem(row.epic.id)}
          className="ml-auto rounded px-1 text-xs text-ec-dark-blue hover:bg-ec-medium-grey"
          aria-label="Eintrag hinzufügen"
        >
          +
        </button>
      </div>
      <div className="text-sm font-medium text-ec-dark-blue">{row.epic.title}</div>
      {collapsed ? (
        <div className="flex flex-wrap gap-1 text-[10px] text-ec-grey-80">
          <Badge variant={row.epic.priority}>
            {priorityLabel[row.epic.priority]}
          </Badge>
          <span className="rounded-full bg-ec-light-grey px-2 py-0.5">
            Backlog {row.counts.backlog}
          </span>
          <span className="rounded-full bg-ec-light-grey px-2 py-0.5">
            In Arbeit {row.counts.in_progress}
          </span>
          <span className="rounded-full bg-ec-light-grey px-2 py-0.5">
            Erledigt {row.counts.done}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge variant={row.epic.priority}>
            {priorityLabel[row.epic.priority]}
          </Badge>
          <span className="text-xs text-ec-grey-80">
            {row.counts.done}/{row.total} · {pct}%
          </span>
        </div>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <>
        {header}
        <div className="col-span-3 rounded-lg border border-dashed border-ec-medium-grey bg-ec-light-grey/30" />
      </>
    );
  }

  return (
    <>
      {header}
      {STATUSES.map((status) => {
        const cellKey = `${row.epic.id}:${status}`;
        const isHovered = hoveredCell === cellKey;
        return (
          <div
            key={status}
            onDragOver={(e) => onCellDragOver(cellKey, e)}
            onDragLeave={() => onCellDragLeave(cellKey)}
            onDrop={() => onCellDrop(row.epic.id, status)}
            className={`min-h-[80px] rounded-lg border-2 p-2 ${
              isHovered
                ? "border-dashed border-ec-dark-blue bg-ec-light-grey/60"
                : "border-transparent bg-ec-light-grey/30"
            }`}
          >
            <div className="flex flex-col gap-2">
              {row.cells[status].map((item) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  hideEpicChip
                  onDragStart={onCardDragStart}
                  onDragEnd={onCardDragEnd}
                  onClick={(id) => {
                    if (justDragged.current) return;
                    onCardClick(id);
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

"use client";

import { useState } from "react";
import { EpicRow } from "./epic-row";
import type { EpicRow as EpicRowData, Status } from "@/lib/backlog/grouping";

interface DevTodosMatrixProps {
  rows: EpicRowData[];
  totals: { backlog: number; in_progress: number; done: number };
  collapsedIds: Set<string>;
  justDragged: React.MutableRefObject<boolean>;
  onToggleCollapse: (epicId: string) => void;
  onAddItem: (epicId: string) => void;
  onCardDragStart: (e: React.DragEvent, id: string) => void;
  onCardDragEnd: () => void;
  onCardClick: (id: string) => void;
  onCellDrop: (epicId: string, status: Status) => void;
}

const STATUS_LABEL: Record<Status, string> = {
  backlog: "Backlog",
  in_progress: "In Arbeit",
  done: "Erledigt",
};

export function DevTodosMatrix({
  rows,
  totals,
  collapsedIds,
  justDragged,
  onToggleCollapse,
  onAddItem,
  onCardDragStart,
  onCardDragEnd,
  onCardClick,
  onCellDrop,
}: DevTodosMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  function handleCellDragOver(cellKey: string, e: React.DragEvent) {
    e.preventDefault();
    if (hoveredCell !== cellKey) setHoveredCell(cellKey);
  }

  function handleCellDragLeave(cellKey: string) {
    if (hoveredCell === cellKey) setHoveredCell(null);
  }

  function handleDrop(epicId: string, status: Status) {
    setHoveredCell(null);
    onCellDrop(epicId, status);
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "220px 1fr 1fr 1fr" }}
    >
      <div className="sticky top-0 z-10 rounded-lg bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ec-grey-80">
        Epic
      </div>
      {(["backlog", "in_progress", "done"] as Status[]).map((status) => (
        <div
          key={status}
          className="sticky top-0 z-10 flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ec-grey-80"
        >
          <span>{STATUS_LABEL[status]}</span>
          <span className="rounded-full bg-ec-light-grey px-2 py-0.5 text-[10px]">
            {totals[status]}
          </span>
        </div>
      ))}

      {rows.map((row) => (
        <EpicRow
          key={row.epic.id}
          row={row}
          collapsed={collapsedIds.has(row.epic.id)}
          hoveredCell={hoveredCell}
          justDragged={justDragged}
          onToggleCollapse={onToggleCollapse}
          onAddItem={onAddItem}
          onCardDragStart={onCardDragStart}
          onCardDragEnd={onCardDragEnd}
          onCardClick={onCardClick}
          onCellDragOver={handleCellDragOver}
          onCellDragLeave={handleCellDragLeave}
          onCellDrop={handleDrop}
        />
      ))}
    </div>
  );
}

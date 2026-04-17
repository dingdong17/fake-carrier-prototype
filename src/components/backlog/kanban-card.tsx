"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface KanbanCardProps {
  item: {
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: "critical" | "high" | "medium" | "low";
  };
  epic?: { itemNumber: string; title: string } | null;
  hideEpicChip?: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd?: () => void;
  onClick?: (id: string) => void;
}

const priorityLabel: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

export function KanbanCard({
  item,
  epic,
  hideEpicChip,
  onDragStart,
  onDragEnd,
  onClick,
}: KanbanCardProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        setDragging(true);
        onDragStart(e, item.id);
      }}
      onDragEnd={() => {
        setDragging(false);
        onDragEnd?.();
      }}
      onClick={() => onClick?.(item.id)}
      className={`cursor-grab rounded-lg border border-ec-medium-grey bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-xs text-ec-grey-80">
          {item.itemNumber}
        </span>
        <Badge variant={item.priority}>
          {priorityLabel[item.priority] || item.priority}
        </Badge>
      </div>
      <p className="text-sm font-medium text-ec-dark-blue">{item.title}</p>
      {!hideEpicChip && epic && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ec-grey-80">
          {epic.itemNumber} · {epic.title}
        </p>
      )}
      {item.description && (
        <p className="mt-1 line-clamp-2 text-xs text-ec-grey-80">
          {item.description}
        </p>
      )}
    </div>
  );
}

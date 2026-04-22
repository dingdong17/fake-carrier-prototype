import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, CATEGORY_LABELS } from "@/lib/backlog/labels";
import type { BacklogCategory } from "@/lib/db/schema";

interface KanbanCardProps {
  item: {
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: "critical" | "high" | "medium" | "low";
    category: BacklogCategory | null;
  };
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onClick: (id: string) => void;
}

export function KanbanCard({ item, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(item.id)}
      className="cursor-pointer rounded-lg border border-ec-medium-grey bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-ec-grey-80">
          {item.itemNumber}
        </span>
        <div className="flex items-center gap-2">
          {item.category && (
            <span className="rounded bg-ec-light-grey px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ec-grey-80">
              {CATEGORY_LABELS[item.category]}
            </span>
          )}
          <Badge variant={item.priority}>{PRIORITY_LABELS[item.priority]}</Badge>
        </div>
      </div>
      <p className="text-sm font-medium text-ec-dark-blue">{item.title}</p>
      {item.description && (
        <p className="mt-1 line-clamp-2 text-xs text-ec-grey-80">
          {item.description}
        </p>
      )}
    </div>
  );
}

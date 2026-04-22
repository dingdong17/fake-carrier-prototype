import { KanbanCard } from "./kanban-card";
import type { BacklogCategory } from "@/lib/db/schema";

interface ColumnItem {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  category: BacklogCategory | null;
}

interface KanbanColumnProps {
  title: string;
  status: string;
  items: ColumnItem[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onItemClick: (id: string) => void;
}

export function KanbanColumn({
  title,
  status,
  items,
  onDragStart,
  onDragEnd,
  onDrop,
  onItemClick,
}: KanbanColumnProps) {
  return (
    <div
      className="flex flex-col rounded-xl border border-ec-medium-grey bg-ec-light-grey/50 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-barlow text-sm font-semibold uppercase tracking-wide text-ec-grey-80">
          {title}
        </h3>
        <span className="rounded-full bg-ec-medium-grey px-2 py-0.5 text-xs font-medium text-ec-grey-80">
          {items.length}
        </span>
      </div>
      <div className="flex min-h-[200px] flex-col gap-2">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}

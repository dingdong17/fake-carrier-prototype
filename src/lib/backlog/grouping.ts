export type Priority = "critical" | "high" | "medium" | "low";
export type Status = "backlog" | "in_progress" | "done";

export interface EpicLite {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  sortOrder: number;
  isProtected: number;
}

export interface ItemLite {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  sortOrder: number;
  epicId: string;
}

export interface EpicRow {
  epic: EpicLite;
  cells: {
    backlog: ItemLite[];
    in_progress: ItemLite[];
    done: ItemLite[];
  };
  total: number;
  counts: { backlog: number; in_progress: number; done: number };
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface BuildInput {
  epics: EpicLite[];
  items: ItemLite[];
  priorityFilter: "all" | Priority;
}

export function buildEpicRows({ epics, items, priorityFilter }: BuildInput): EpicRow[] {
  const filteredItems =
    priorityFilter === "all"
      ? items
      : items.filter((i) => i.priority === priorityFilter);

  const rows: EpicRow[] = epics.map((epic) => {
    const own = filteredItems.filter((i) => i.epicId === epic.id);
    const byStatus: Record<Status, ItemLite[]> = {
      backlog: [],
      in_progress: [],
      done: [],
    };
    for (const item of own) {
      byStatus[item.status].push(item);
    }
    for (const status of ["backlog", "in_progress", "done"] as Status[]) {
      byStatus[status].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return {
      epic,
      cells: byStatus,
      total: own.length,
      counts: {
        backlog: byStatus.backlog.length,
        in_progress: byStatus.in_progress.length,
        done: byStatus.done.length,
      },
    };
  });

  const orphansRows = rows.filter((r) => r.epic.isProtected === 1 && r.total > 0);
  const regularRows = rows.filter((r) => r.epic.isProtected !== 1);

  regularRows.sort((a, b) => {
    const p = PRIORITY_ORDER[a.epic.priority] - PRIORITY_ORDER[b.epic.priority];
    if (p !== 0) return p;
    return a.epic.sortOrder - b.epic.sortOrder;
  });

  return [...regularRows, ...orphansRows];
}

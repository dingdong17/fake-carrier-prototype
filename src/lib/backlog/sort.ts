// src/lib/backlog/sort.ts
import type { Priority } from "./labels";

const RANK: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortByPriority<T extends { priority: Priority; createdAt: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const r = RANK[a.priority] - RANK[b.priority];
    if (r !== 0) return r;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// src/lib/backlog/labels.ts
import type { BacklogCategory } from "@/lib/db/schema";

export type Priority = "critical" | "high" | "medium" | "low";
export type Status = "backlog" | "in_progress" | "done";

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  in_progress: "In Arbeit",
  done: "Erledigt",
};

export const CATEGORY_LABELS: Record<BacklogCategory, string> = {
  ui: "UI",
  ai_chat: "AI Chat",
  ai_analytics: "AI Analytics",
  external_api: "External API",
  client_credits: "Client+Credit System",
  security_rbac: "Security + RBAC",
  infrastructure: "Infrastructure",
};

export const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS) as BacklogCategory[];

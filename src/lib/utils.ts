import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

export function formatCheckNumber(seq: number): string {
  return `FC-${String(seq).padStart(3, "0")}`;
}

export function formatBacklogNumber(seq: number): string {
  return `BL-${String(seq).padStart(3, "0")}`;
}

export function formatEpicNumber(seq: number): string {
  return `EPIC-${String(seq).padStart(3, "0")}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

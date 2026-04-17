# Dev ToDos Merged View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate `/backlog` Kanban + `/backlog/epics` overview with a single "Dev ToDos" matrix page where epics are rows and status columns run across, supporting 2D drag-and-drop (epic + status) and collapsible epic rows.

**Architecture:** No API changes. The page fetches both `/api/backlog` and `/api/epics` on mount, runs a pure client-side grouping function that produces `EpicRow[]` sorted by priority, and renders a CSS-grid matrix. Each expanded cell is a drop target that sets both `epicId` and `status` atomically via the existing `/api/backlog` update endpoint. Epic CRUD moves into a single "Epics verwalten" modal reachable from the page header.

**Tech Stack:** Next.js 15 App Router, React client components, Tailwind, vitest (pure helpers only — no UI tests).

**Design spec:** `docs/superpowers/specs/2026-04-17-dev-todos-merged-view-design.md`.

---

## File structure

### Created
- `src/lib/backlog/grouping.ts` — pure grouping / sorting helper. Inputs: `epics`, `items`, `priorityFilter`, `expandedState`. Output: `EpicRow[]`.
- `src/lib/backlog/grouping.test.ts` — vitest coverage of the grouping rules.
- `src/components/backlog/dev-todos-matrix.tsx` — the grid component that holds the sticky column header + one `EpicRow` per visible epic. Owns drop-hover state.
- `src/components/backlog/epic-row.tsx` — renders one epic row (expanded or collapsed). Uses `display: contents` so its cells participate in the parent grid.
- `src/components/backlog/manage-epics-modal.tsx` — modal to create/edit/delete epics. Inlines what used to live in `add-epic-form.tsx`.

### Modified
- `src/app/backlog/page.tsx` — full rewrite around the matrix model, plus `justDraggedRef` for click/drag coexistence.
- `src/components/backlog/kanban-card.tsx` — add optional `hideEpicChip` prop.
- `src/components/layout/nav-links.tsx` — rename "Backlog" → "Dev ToDos", remove "Epics" link, simplify `isActive`.

### Deleted
- `src/app/backlog/epics/page.tsx`
- `src/components/backlog/epic-card.tsx`
- `src/components/backlog/add-epic-form.tsx`
- `src/components/backlog/epic-filter.tsx`
- `src/components/backlog/kanban-column.tsx`

### Ordering (to keep the build green between tasks)

1. Pure grouping helper + tests (no UI).
2. `KanbanCard` gets a backwards-compatible `hideEpicChip`.
3. `ManageEpicsModal` is added (unused yet).
4. `EpicRow` is added (unused yet).
5. `DevTodosMatrix` is added (unused yet).
6. `/backlog/page.tsx` rewritten to consume the matrix + modal (old page disappears here).
7. Nav update (rename + remove Epics link). After this point `/backlog/epics` is unlinked.
8. Delete the now-orphaned files (`/backlog/epics/page.tsx`, `epic-card.tsx`, `add-epic-form.tsx`, `epic-filter.tsx`, `kanban-column.tsx`).
9. Final verification (full test suite, typecheck, manual E2E smoke).

---

## Task 1: Pure grouping helper `src/lib/backlog/grouping.ts`

**Files:**
- Create: `src/lib/backlog/grouping.ts`
- Create: `src/lib/backlog/grouping.test.ts`

Defines the data shape used by the matrix and all sorting rules.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/backlog/grouping.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildEpicRows, PRIORITY_ORDER } from "./grouping";

type Item = {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  sortOrder: number;
  epicId: string;
};

type Epic = {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  sortOrder: number;
  isProtected: number;
};

function e(overrides: Partial<Epic> = {}): Epic {
  return {
    id: overrides.id ?? "e1",
    itemNumber: overrides.itemNumber ?? "EPIC-002",
    title: overrides.title ?? "Alpha",
    description: null,
    priority: overrides.priority ?? "medium",
    status: "backlog",
    sortOrder: overrides.sortOrder ?? 0,
    isProtected: overrides.isProtected ?? 0,
    ...overrides,
  };
}

function i(overrides: Partial<Item> = {}): Item {
  return {
    id: overrides.id ?? "i1",
    itemNumber: overrides.itemNumber ?? "BL-001",
    title: overrides.title ?? "Item",
    description: null,
    priority: overrides.priority ?? "medium",
    status: overrides.status ?? "backlog",
    sortOrder: overrides.sortOrder ?? 0,
    epicId: overrides.epicId ?? "e1",
    ...overrides,
  };
}

describe("PRIORITY_ORDER", () => {
  it("orders critical < high < medium < low", () => {
    expect(PRIORITY_ORDER.critical).toBeLessThan(PRIORITY_ORDER.high);
    expect(PRIORITY_ORDER.high).toBeLessThan(PRIORITY_ORDER.medium);
    expect(PRIORITY_ORDER.medium).toBeLessThan(PRIORITY_ORDER.low);
  });
});

describe("buildEpicRows", () => {
  it("produces one row per epic with items split into the three cells", () => {
    const epic = e();
    const items = [
      i({ id: "a", status: "backlog" }),
      i({ id: "b", status: "in_progress" }),
      i({ id: "c", status: "done" }),
    ];
    const rows = buildEpicRows({ epics: [epic], items, priorityFilter: "all" });
    expect(rows).toHaveLength(1);
    expect(rows[0].cells.backlog.map((x) => x.id)).toEqual(["a"]);
    expect(rows[0].cells.in_progress.map((x) => x.id)).toEqual(["b"]);
    expect(rows[0].cells.done.map((x) => x.id)).toEqual(["c"]);
    expect(rows[0].total).toBe(3);
    expect(rows[0].counts).toEqual({ backlog: 1, in_progress: 1, done: 1 });
  });

  it("applies priority filter to items", () => {
    const epic = e();
    const items = [
      i({ id: "a", priority: "high" }),
      i({ id: "b", priority: "low" }),
    ];
    const rows = buildEpicRows({ epics: [epic], items, priorityFilter: "high" });
    expect(rows[0].cells.backlog.map((x) => x.id)).toEqual(["a"]);
    expect(rows[0].total).toBe(1);
  });

  it("hides Orphans when it has no items after filtering", () => {
    const orphans = e({ id: "orph", itemNumber: "EPIC-001", title: "Orphans", isProtected: 1 });
    const alpha = e({ id: "a", itemNumber: "EPIC-002", title: "Alpha" });
    const items = [i({ id: "one", epicId: "a" })];
    const rows = buildEpicRows({ epics: [orphans, alpha], items, priorityFilter: "all" });
    expect(rows.map((r) => r.epic.id)).toEqual(["a"]);
  });

  it("keeps Orphans when it has items, and forces it to the bottom", () => {
    const orphans = e({ id: "orph", itemNumber: "EPIC-001", title: "Orphans", isProtected: 1, priority: "critical" });
    const alpha = e({ id: "a", itemNumber: "EPIC-002", title: "Alpha", priority: "low" });
    const items = [i({ id: "one", epicId: "orph" }), i({ id: "two", epicId: "a" })];
    const rows = buildEpicRows({ epics: [orphans, alpha], items, priorityFilter: "all" });
    expect(rows.map((r) => r.epic.id)).toEqual(["a", "orph"]);
  });

  it("sorts non-Orphan epics by priority then sortOrder", () => {
    const epics = [
      e({ id: "low1", priority: "low", sortOrder: 1 }),
      e({ id: "med1", priority: "medium", sortOrder: 2 }),
      e({ id: "crit1", priority: "critical", sortOrder: 3 }),
      e({ id: "med2", priority: "medium", sortOrder: 0 }),
    ];
    const rows = buildEpicRows({ epics, items: [i({ epicId: "low1" }), i({ epicId: "med1" }), i({ epicId: "crit1" }), i({ epicId: "med2" })], priorityFilter: "all" });
    expect(rows.map((r) => r.epic.id)).toEqual(["crit1", "med2", "med1", "low1"]);
  });

  it("handles items pointing at a missing epic by skipping them", () => {
    const rows = buildEpicRows({ epics: [e()], items: [i({ epicId: "ghost" })], priorityFilter: "all" });
    expect(rows[0].total).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/lib/backlog/grouping.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/lib/backlog/grouping.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npx vitest run src/lib/backlog/grouping.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors).

- [ ] **Step 6: Commit**

```bash
git add src/lib/backlog/grouping.ts src/lib/backlog/grouping.test.ts
git commit -m "feat(backlog): add grouping helper for Dev ToDos matrix"
```

---

## Task 2: `KanbanCard` gains optional `hideEpicChip` prop

**Files:**
- Modify: `src/components/backlog/kanban-card.tsx`

Additive change, backwards compatible.

- [ ] **Step 1: Replace the file**

Replace the contents of `src/components/backlog/kanban-card.tsx` with:

```tsx
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
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onClick?.(item.id)}
      className="cursor-grab rounded-lg border border-ec-medium-grey bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors — `KanbanColumn` still uses the old signature but the new fields are all optional).

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/kanban-card.tsx
git commit -m "feat(backlog): KanbanCard supports hideEpicChip and onDragEnd"
```

---

## Task 3: `ManageEpicsModal`

**Files:**
- Create: `src/components/backlog/manage-epics-modal.tsx`

Modal that lists all epics, supports inline create/edit, and delete. Fetches epics on open, calls `/api/epics` for writes, and invokes an `onDirty` callback when any mutation succeeds so the parent can re-fetch.

- [ ] **Step 1: Create the file**

Create `src/components/backlog/manage-epics-modal.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

interface Epic {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  isProtected: number;
  progress: { total: number; done: number; inProgress: number };
}

interface ManageEpicsModalProps {
  open: boolean;
  onClose: () => void;
  onDirty: () => void;
}

const priorityLabel: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

export function ManageEpicsModal({ open, onClose, onDirty }: ManageEpicsModalProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPriority, setDraftPriority] = useState<Epic["priority"]>("medium");
  const [draftStatus, setDraftStatus] = useState<Epic["status"]>("backlog");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<Epic["priority"]>("medium");

  const fetchEpics = useCallback(async () => {
    const res = await fetch("/api/epics");
    const data = await res.json();
    setEpics(data.epics);
  }, []);

  useEffect(() => {
    if (open) fetchEpics();
  }, [open, fetchEpics]);

  function startEdit(epic: Epic) {
    setEditingId(epic.id);
    setDraftTitle(epic.title);
    setDraftDescription(epic.description ?? "");
    setDraftPriority(epic.priority);
    setDraftStatus(epic.status);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(epic: Epic) {
    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: epic.id,
        title: draftTitle,
        description: draftDescription,
        priority: draftPriority,
        status: draftStatus,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    setEditingId(null);
    await fetchEpics();
    onDirty();
  }

  async function deleteEpic(epic: Epic) {
    if (!confirm(`Epic ${epic.itemNumber} löschen? Items wandern zu Orphans.`)) {
      return;
    }
    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: epic.id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    await fetchEpics();
    onDirty();
  }

  async function createEpic(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title: newTitle,
        description: newDescription,
        priority: newPriority,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewPriority("medium");
    await fetchEpics();
    onDirty();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-barlow text-lg font-semibold text-ec-dark-blue">
            Epics verwalten
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-ec-grey-80 hover:bg-ec-light-grey"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={createEpic}
          className="mb-4 rounded-lg border border-ec-medium-grey p-3"
        >
          <div className="mb-2 text-xs font-medium text-ec-grey-80">Neues Epic</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Titel"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Epic["priority"])}
              className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
            >
              <option value="critical">Kritisch</option>
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
            >
              Anlegen
            </button>
          </div>
          <textarea
            placeholder="Beschreibung (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          />
        </form>

        <div className="max-h-[50vh] overflow-y-auto">
          {epics.map((epic) => {
            const isEditing = editingId === epic.id;
            return (
              <div
                key={epic.id}
                className="mb-2 rounded-lg border border-ec-medium-grey p-3"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="font-mono text-xs text-ec-grey-80">{epic.itemNumber}</div>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
                    />
                    <textarea
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
                    />
                    <div className="flex gap-2">
                      <select
                        value={draftPriority}
                        onChange={(e) => setDraftPriority(e.target.value as Epic["priority"])}
                        className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
                      >
                        <option value="critical">Kritisch</option>
                        <option value="high">Hoch</option>
                        <option value="medium">Mittel</option>
                        <option value="low">Niedrig</option>
                      </select>
                      <select
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value as Epic["status"])}
                        className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
                      >
                        <option value="backlog">Backlog</option>
                        <option value="in_progress">In Arbeit</option>
                        <option value="done">Erledigt</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => saveEdit(epic)}
                        className="rounded-lg bg-ec-dark-blue px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
                      >
                        Speichern
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm font-medium text-ec-grey-80 transition-colors hover:bg-ec-light-grey"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-ec-grey-80">{epic.itemNumber}</div>
                      <div className="text-sm font-medium text-ec-dark-blue">{epic.title}</div>
                      <div className="text-xs text-ec-grey-80">
                        {priorityLabel[epic.priority]} · {epic.progress.done}/{epic.progress.total} erledigt
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {epic.isProtected === 1 ? (
                        <span className="text-[10px] uppercase tracking-wide text-ec-grey-80">
                          Geschützt
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(epic)}
                            className="text-xs text-ec-dark-blue hover:underline"
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEpic(epic)}
                            className="text-xs text-ec-red hover:underline"
                          >
                            Löschen
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/manage-epics-modal.tsx
git commit -m "feat(backlog): add Epics verwalten modal"
```

---

## Task 4: `EpicRow`

**Files:**
- Create: `src/components/backlog/epic-row.tsx`

Renders one row in the matrix grid. Uses `display: contents` via a `<> … </>` fragment wrapping individual grid children so the cells participate in the parent grid's column layout.

- [ ] **Step 1: Create the file**

Create `src/components/backlog/epic-row.tsx`:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/epic-row.tsx
git commit -m "feat(backlog): add EpicRow component for Dev ToDos matrix"
```

---

## Task 5: `DevTodosMatrix`

**Files:**
- Create: `src/components/backlog/dev-todos-matrix.tsx`

Grid shell with the sticky column header and a list of `EpicRow`s. Owns `hoveredCell` state (purely for drag feedback).

- [ ] **Step 1: Create the file**

Create `src/components/backlog/dev-todos-matrix.tsx`:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/backlog/dev-todos-matrix.tsx
git commit -m "feat(backlog): add DevTodosMatrix grid component"
```

---

## Task 6: Rewrite `/backlog/page.tsx`

**Files:**
- Modify: `src/app/backlog/page.tsx`

This is the keystone task that replaces the existing page and switches consumers from `KanbanColumn`/`AddItemForm`/`EpicFilter` to the new matrix + modal.

The add-item form is inlined as a small local modal (simpler than the current `AddItemForm` toggle since we now have a per-epic "+" that needs to prefill a specific epic).

- [ ] **Step 1: Replace the file**

Replace `src/app/backlog/page.tsx` with:

```tsx
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { DevTodosMatrix } from "@/components/backlog/dev-todos-matrix";
import { EditItemModal } from "@/components/backlog/edit-item-modal";
import { ManageEpicsModal } from "@/components/backlog/manage-epics-modal";
import {
  buildEpicRows,
  type EpicLite,
  type ItemLite,
  type Priority,
  type Status,
} from "@/lib/backlog/grouping";

interface Epic extends EpicLite {
  progress?: { total: number; done: number; inProgress: number };
}

type BacklogItem = ItemLite;

function BacklogPageInner() {
  const searchParams = useSearchParams();
  const epicParam = searchParams.get("epic") ?? "all";

  const [items, setItems] = useState<BacklogItem[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [addDialog, setAddDialog] = useState<{ epicId: string } | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addPriority, setAddPriority] = useState<Priority>("medium");

  const draggedId = useRef<string | null>(null);
  const justDragged = useRef(false);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/backlog");
    const data = await res.json();
    setItems(data.items);
  }, []);

  const fetchEpics = useCallback(async () => {
    const res = await fetch("/api/epics");
    const data = await res.json();
    setEpics(data.epics);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchEpics();
  }, [fetchItems, fetchEpics]);

  // Apply URL ?epic= once epics load.
  useEffect(() => {
    if (epics.length === 0) return;
    if (epicParam === "all") {
      setCollapsedIds(new Set());
      return;
    }
    const focused = epics.find((e) => e.itemNumber === epicParam);
    if (!focused) return;
    const next = new Set<string>();
    for (const e of epics) {
      if (e.id !== focused.id) next.add(e.id);
    }
    setCollapsedIds(next);
  }, [epicParam, epics]);

  const rows = useMemo(
    () => buildEpicRows({ epics, items, priorityFilter }),
    [epics, items, priorityFilter],
  );

  const totals = useMemo(
    () => ({
      backlog: rows.reduce((n, r) => n + r.counts.backlog, 0),
      in_progress: rows.reduce((n, r) => n + r.counts.in_progress, 0),
      done: rows.reduce((n, r) => n + r.counts.done, 0),
    }),
    [rows],
  );

  function toggleCollapse(epicId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId);
      else next.add(epicId);
      return next;
    });
  }

  function openAddDialog(epicId: string) {
    setAddTitle("");
    setAddDescription("");
    setAddPriority("medium");
    setAddDialog({ epicId });
  }

  function openGlobalAddDialog() {
    const firstExpanded = rows.find((r) => !collapsedIds.has(r.epic.id));
    const orphans = epics.find((e) => e.isProtected === 1);
    const chosen =
      firstExpanded?.epic.id ?? orphans?.id ?? epics[0]?.id ?? "";
    if (!chosen) return;
    openAddDialog(chosen);
  }

  function handleCardDragStart(e: React.DragEvent, id: string) {
    draggedId.current = id;
    justDragged.current = true;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleCardDragEnd() {
    // Clear on next tick so the click event after a drop is suppressed.
    setTimeout(() => {
      justDragged.current = false;
    }, 0);
  }

  async function handleCellDrop(targetEpicId: string, targetStatus: Status) {
    const id = draggedId.current;
    if (!id) return;
    draggedId.current = null;
    if (collapsedIds.has(targetEpicId)) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.epicId === targetEpicId && item.status === targetStatus) return;

    const snapshot = items;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, epicId: targetEpicId, status: targetStatus } : i,
      ),
    );

    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id,
        epicId: targetEpicId,
        status: targetStatus,
      }),
    });
    if (!res.ok) {
      setItems(snapshot);
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    await fetchEpics();
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addDialog || !addTitle.trim()) return;
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title: addTitle,
        description: addDescription,
        priority: addPriority,
        epicId: addDialog.epicId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
    await fetchEpics();
    setAddDialog(null);
  }

  async function handleSaveEdit(updates: {
    id: string;
    title: string;
    description: string;
    priority: string;
    epicId: string;
  }) {
    const snapshot = items;
    setItems((prev) =>
      prev.map((i) =>
        i.id === updates.id
          ? {
              ...i,
              title: updates.title,
              description: updates.description,
              priority: updates.priority as Priority,
              epicId: updates.epicId,
            }
          : i,
      ),
    );
    setEditingId(null);
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ...updates }),
    });
    if (!res.ok) {
      setItems(snapshot);
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    await fetchEpics();
  }

  const editingItem = editingId
    ? items.find((i) => i.id === editingId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-barlow text-3xl font-semibold text-ec-dark-blue">
          Dev ToDos
        </h1>
        <div className="flex gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as "all" | Priority)}
            className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
            aria-label="Prioritätsfilter"
          >
            <option value="all">Alle Prioritäten</option>
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="rounded-lg border border-ec-medium-grey bg-white px-3 py-2 text-sm font-medium text-ec-dark-blue transition-colors hover:bg-ec-light-grey"
          >
            Epics verwalten
          </button>
          <button
            type="button"
            onClick={openGlobalAddDialog}
            className="rounded-lg bg-ec-dark-blue px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
          >
            + Neues Eintrag
          </button>
        </div>
      </div>

      <DevTodosMatrix
        rows={rows}
        totals={totals}
        collapsedIds={collapsedIds}
        justDragged={justDragged}
        onToggleCollapse={toggleCollapse}
        onAddItem={openAddDialog}
        onCardDragStart={handleCardDragStart}
        onCardDragEnd={handleCardDragEnd}
        onCardClick={(id) => setEditingId(id)}
        onCellDrop={handleCellDrop}
      />

      <EditItemModal
        item={
          editingItem
            ? {
                id: editingItem.id,
                itemNumber: editingItem.itemNumber,
                title: editingItem.title,
                description: editingItem.description,
                priority: editingItem.priority,
                epicId: editingItem.epicId,
              }
            : null
        }
        epics={epics.map((e) => ({ id: e.id, itemNumber: e.itemNumber, title: e.title }))}
        onClose={() => setEditingId(null)}
        onSave={handleSaveEdit}
      />

      <ManageEpicsModal
        open={manageOpen}
        onClose={() => {
          setManageOpen(false);
          fetchEpics();
          fetchItems();
        }}
        onDirty={() => {
          fetchEpics();
          fetchItems();
        }}
      />

      {addDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAddDialog(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitAdd}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-barlow text-lg font-semibold text-ec-dark-blue">
                Neuer Eintrag
              </h2>
              <button
                type="button"
                onClick={() => setAddDialog(null)}
                className="rounded px-2 text-ec-grey-80 hover:bg-ec-light-grey"
                aria-label="Schließen"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <select
                value={addDialog.epicId}
                onChange={(e) =>
                  setAddDialog({ epicId: e.target.value })
                }
                className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
              >
                {epics.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.itemNumber} · {ep.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Titel"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
              />
              <textarea
                placeholder="Beschreibung (optional)"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
              />
              <select
                value={addPriority}
                onChange={(e) => setAddPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
              >
                <option value="critical">Kritisch</option>
                <option value="high">Hoch</option>
                <option value="medium">Mittel</option>
                <option value="low">Niedrig</option>
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
              >
                Hinzufügen
              </button>
              <button
                type="button"
                onClick={() => setAddDialog(null)}
                className="rounded-lg border border-ec-medium-grey px-4 py-2 text-sm font-medium text-ec-grey-80 transition-colors hover:bg-ec-light-grey"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

export default function BacklogPage() {
  return (
    <Suspense fallback={null}>
      <BacklogPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors). The old page referenced `KanbanColumn`, `AddItemForm`, `EpicFilter`; those files still exist but are no longer imported by any live code. They'll be deleted in Task 8 and the typechecker won't complain about unused files.

- [ ] **Step 3: Quick smoke — dev server up and both endpoints return 200**

```bash
npm run dev &
DEV_PID=$!
sleep 10
echo "---"
curl -s -o /dev/null -w "/backlog -> %{http_code}\n" http://localhost:3000/backlog
curl -s -o /dev/null -w "/backlog?epic=EPIC-002 -> %{http_code}\n" "http://localhost:3000/backlog?epic=EPIC-002"
curl -s http://localhost:3000/api/backlog | head -c 120
echo
curl -s http://localhost:3000/api/epics | head -c 120
echo
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true
```

Both page routes should return `200`. The JSON previews should be non-empty.

- [ ] **Step 4: Commit**

```bash
git add src/app/backlog/page.tsx
git commit -m "feat(backlog): rewrite /backlog as Dev ToDos matrix page"
```

---

## Task 7: Update nav — rename "Backlog" → "Dev ToDos", drop "Epics"

**Files:**
- Modify: `src/components/layout/nav-links.tsx`

- [ ] **Step 1: Replace the file**

Replace `src/components/layout/nav-links.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Start" },
  { href: "/check", label: "Neue Prüfung" },
  { href: "/history", label: "Verlauf" },
  { href: "/backlog", label: "Dev ToDos" },
  { href: "/feedback", label: "Feedback" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={
              isActive
                ? { backgroundColor: "var(--brand-primary)", color: "#fff" }
                : { color: "var(--brand-text)" }
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/nav-links.tsx
git commit -m "feat(nav): rename Backlog to Dev ToDos; remove Epics link"
```

---

## Task 8: Delete old files

**Files:**
- Delete: `src/app/backlog/epics/page.tsx`
- Delete: `src/components/backlog/epic-card.tsx`
- Delete: `src/components/backlog/add-epic-form.tsx`
- Delete: `src/components/backlog/epic-filter.tsx`
- Delete: `src/components/backlog/kanban-column.tsx`

After Task 6 the page no longer imports any of these; after Task 7 no nav link targets them. Now they are safe to delete.

- [ ] **Step 1: Verify each file is unreferenced**

Run:
```bash
for f in \
  src/app/backlog/epics/page.tsx \
  src/components/backlog/epic-card.tsx \
  src/components/backlog/add-epic-form.tsx \
  src/components/backlog/epic-filter.tsx \
  src/components/backlog/kanban-column.tsx; do
  echo "=== $f ==="
  base=$(basename "$f" .tsx)
  grep -R --include='*.ts' --include='*.tsx' "from.*${base}" src \
    --exclude-dir=node_modules || echo "(no references)"
done
```

Expected: each file shows `(no references)` (grep shouldn't find any import of it in `src/`).

If any reference is found, STOP — the plan is wrong about what the rewrite replaced. Do NOT delete the file. Report back.

- [ ] **Step 2: Delete the files**

```bash
git rm \
  src/app/backlog/epics/page.tsx \
  src/components/backlog/epic-card.tsx \
  src/components/backlog/add-epic-form.tsx \
  src/components/backlog/epic-filter.tsx \
  src/components/backlog/kanban-column.tsx
# Also remove the now-empty directory if git didn't already.
rmdir src/app/backlog/epics 2>/dev/null || true
```

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npx vitest run`
Expected: all tests green.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(backlog): remove legacy pages/components after matrix rewrite"
```

---

## Task 9: Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the new `grouping.test.ts` (6 new tests, ~118 total).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification in a browser**

With `npm run dev` running, go through these interactions:

1. Visit `/backlog`. Title reads "Dev ToDos". Nav shows "Dev ToDos" (highlighted), no "Epics" link.
2. Visit `/backlog/epics` → 404. Expected.
3. Matrix renders: every epic with items is one row, three status cells each, plus three column-header labels at top with count pills.
4. Collapse an epic via its chevron → cells disappear, the row becomes a single line with count pills.
5. Expand it again.
6. Drag a card from epic A, column "Backlog" into epic B, column "In Arbeit" → card moves; refresh confirms it stuck (both `status` AND `epicId` changed).
7. Drag a card into a collapsed row → nothing happens (no visual feedback, no API call).
8. Click a card → Edit modal opens. Reassign the epic inside the modal, save → card jumps row.
9. Click a card after dragging (drop it, then click again) → modal opens normally. Click right after a drag release should NOT open the modal.
10. Global "+ Neues Eintrag" → dialog with epic pre-selected (first expanded epic or Orphans). Submit creates the item at the top of its new cell.
11. Per-epic "+" on a row → dialog pre-selects that epic.
12. "Epics verwalten" → modal opens. Create an epic "Sandbox" → appears in the table. Edit its title → persists. Delete it → items go to Orphans, Orphans row appears in the matrix.
13. Deep link `/backlog?epic=EPIC-002` → only EPIC-002 expanded, all others collapsed.
14. Priority filter "Hoch" → only high-priority items remain in cells; epic rows without matching items render empty cells.
15. `/` , `/check`, `/history`, `/feedback` still reachable and active-highlighting correctly.

- [ ] **Step 4: Commit any adjustments from verification**

If the manual walk-through surfaced a fix, commit it with a descriptive message. Otherwise, skip.

---

## Acceptance summary

- Single `/backlog` page ("Dev ToDos") replaces both previous pages.
- Matrix: epics as rows, three status columns; expanded rows render three cells, each a drop zone.
- Drop sets `epicId` and `status` atomically via existing `/api/backlog` update.
- Collapse toggle per epic; `?epic=EPIC-NNN` deep link expands one, collapses the rest.
- "Epics verwalten" modal for create/edit/delete; inline add dialog for items (global + per-epic).
- Click vs drag disambiguated by `justDraggedRef`.
- Nav updated; legacy files deleted; typecheck + vitest green.

# Dev ToDos — Merged Epics + Items View — Design Spec

**Date:** 2026-04-17
**Status:** Approved, ready for implementation planning
**Scope:** Merge the current `/backlog` Kanban and `/backlog/epics` overview into a single "Dev ToDos" page with epics as parents and items as children. Delete the dedicated epics page.

## Purpose

Today the backlog and epics live on two pages. The user wants parent/child visibility in a single glance: every item under its epic, no page switching, a cleaner nav. The flat 3-column Kanban becomes a matrix with epics as rows and the three status columns running across. Epic management moves into a single modal; the `/backlog/epics` route disappears.

## Decisions

| # | Decision |
|---|---|
| 1 | `/backlog/epics` route deleted entirely. |
| 2 | Nav label changed: **Backlog → Dev ToDos**. Route stays `/backlog`. |
| 3 | Epic create/edit/delete handled via a single **"Epics verwalten"** modal reachable from a button in the page header. |
| 4 | Drag-and-drop is 2D: dropping a card into any cell sets both `epicId` and `status` atomically. |
| 5 | Each epic row has a collapse chevron. Collapsed rows show a summary and do NOT accept drops. |
| 6 | Priority filter dropdown stays; Epic filter dropdown is removed (use collapse instead). |
| 7 | Item creation via both a global "+ Neues Eintrag" button and a per-epic "+" button (prefills that epic). |
| 8 | Orphans row rendered only when it has items. |
| 9 | Epics sorted by priority (critical → high → medium → low), then by `sortOrder` as tiebreak. |
| 10 | `?epic=EPIC-NNN` expands that epic and collapses the rest; no param → all expanded. |
| 11 | Fix the Task-10 drag/click coexistence bug via a `justDraggedRef` guard on the card click. |

## Architecture

No API changes. Both `/api/backlog` and `/api/epics` stay as-is. All grouping, sorting, filtering, and collapse state is client-side.

### Derived row model

```ts
type EpicRow = {
  epic: Epic;                   // id, itemNumber, title, description, priority, status, isProtected
  cells: {
    backlog: BacklogItem[];
    in_progress: BacklogItem[];
    done: BacklogItem[];
  };
  total: number;
  counts: { backlog: number; in_progress: number; done: number };
};
```

### Pipeline (per render)

1. Fetch both `/api/backlog` and `/api/epics` on mount.
2. Apply the Priority filter to items.
3. Group filtered items by `epicId`.
4. Build an `EpicRow` for every epic.
5. Drop the Orphans row when its `total === 0`.
6. Sort: priority weight (`critical=0, high=1, medium=2, low=3`), then `sortOrder` asc.
7. Orphans row, if shown, is forced to the bottom regardless of priority.

### Collapse state

- `Record<string, boolean>` keyed by epic id, held in page-level React state.
- Initial state:
  - If URL has `?epic=EPIC-NNN` → that epic expanded, all others collapsed.
  - Otherwise → all expanded.
- Toggle persists only in memory (no URL write-back on manual chevron clicks).

## UI

### Page shell

- Route: `/backlog` (unchanged).
- H1 text: **Dev ToDos** (German-localized label stays German if project drifts later; today it's one label).
- Header row, right side:
  - Priority filter `<select>` (Alle Prioritäten / Kritisch / Hoch / Mittel / Niedrig).
  - "Epics verwalten" button — opens the management modal.
  - "+ Neues Eintrag" — opens the existing add-item form with the current filter epic or Orphans prefilled.

### Matrix grid

CSS grid with `grid-template-columns: 220px 1fr 1fr 1fr` (header cell wider to fit epic title + badges + "+"). One row per visible epic.

Sticky top row shows the three status labels (`Backlog`, `In Arbeit`, `Erledigt`) with a small total count pill per column.

### Epic row — expanded

- **Column 1 (epic header, 220px):**
  - Row 1: chevron toggle (▾), mono `EPIC-NNN`, "+" icon button.
  - Row 2: epic title.
  - Row 3: priority Badge, progress text `{done}/{total} · {pct}%`.
- **Columns 2–4 (status cells):**
  - Each cell is a drop zone with `min-height: 80px`, light-grey background, dashed border on drag-over.
  - Items rendered with the existing `KanbanCard` (epic chip hidden when inside a grouped row — see below).
  - Empty cell renders as an empty rectangle and still accepts drops.

### Epic row — collapsed

- Single row, no column cells. Chevron (▸), mono `EPIC-NNN`, title, priority Badge, three count pills `Backlog 2 · In Arbeit 1 · Erledigt 1`, "+" icon button.
- No drop target. Drag-over events ignored.

### Card changes

- `KanbanCard` receives a new optional `hideEpicChip?: boolean` prop. When true (always on this page), the chip line is suppressed — the row header already names the epic.
- Click behavior: opens the existing `EditItemModal` unless `justDraggedRef.current` is true.

### Epics verwalten modal

- Fixed overlay, similar structure to `EditItemModal`.
- Lists all epics in a table/grid: `EPIC-NNN`, title, priority, status, progress summary, actions.
  - Edit: opens an inline edit row (title, description, priority, status).
  - Delete: confirm dialog (same copy as today's `EpicCard`), disabled for `isProtected === 1`.
  - "+ Neues Epic" row at the top (reuses the logic from today's `AddEpicForm`, inlined into the modal).
- On any mutation: re-fetch epics in the background; the underlying Dev ToDos page picks up changes when the modal closes.

### Removed / changed

- **Delete:** `src/app/backlog/epics/page.tsx` and its components exclusive to it (`epic-card.tsx`, `add-epic-form.tsx`) unless reused by the modal. (The modal will reuse `AddEpicForm` logic but may inline it; if it inlines, the file is removed.)
- **Delete:** `src/components/backlog/epic-filter.tsx` (no longer used anywhere).
- **Nav:** `src/components/layout/nav-links.tsx` — rename "Backlog" label to "Dev ToDos"; remove the "Epics" link. Active-state logic simplifies back to `pathname.startsWith("/backlog")`.
- **Kanban column/card:** `KanbanColumn` is not used by the new page. It stays in the codebase only if we leave the path open for reuse; if unused, delete it. Current plan: delete — YAGNI.

## Drag-and-drop

### Drop handler

Single handler on each expanded cell:

```ts
function handleDrop(targetEpicId: string, targetStatus: Status) {
  const id = draggedId;
  if (!id) return;
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (item.epicId === targetEpicId && item.status === targetStatus) return;

  // optimistic
  setItems(prev => prev.map(i =>
    i.id === id ? { ...i, epicId: targetEpicId, status: targetStatus } : i
  ));
  setDraggedId(null);

  const res = await fetch("/api/backlog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, epicId: targetEpicId, status: targetStatus }),
  });
  if (!res.ok) {
    // rollback
    setItems(prev => prev.map(i => i.id === id ? item : i));
    const err = await res.json().catch(() => ({ error: "Fehler" }));
    alert(err.error ?? "Fehler");
    return;
  }
  await fetchEpics();
}
```

### Visual feedback

- `onDragStart`: set `draggedId`, set `justDraggedRef.current = true`, dim the source card to 50% opacity via state.
- `onDragOver` on a cell: `e.preventDefault()`; add a dashed dark-blue border to that cell (React state tracking hovered cell key `${epicId}:${status}`).
- `onDragEnd` on the card: clear source opacity; schedule `setTimeout(() => { justDraggedRef.current = false; }, 0)`.
- Collapsed rows: no `onDrop` / `onDragOver` handlers attached at all.

### Click vs drag

- `KanbanCard` already receives `onClick`. The page-level handler wraps it:
  ```ts
  onCardClick={(id) => {
    if (justDraggedRef.current) return;
    setEditingId(id);
  }}
  ```

## Route and nav cleanup

- `src/app/backlog/epics/page.tsx` deleted.
- `src/components/backlog/epic-card.tsx` deleted.
- `src/components/backlog/add-epic-form.tsx` deleted. The "+ Neues Epic" row is inlined into the new management modal rather than reused as a standalone component.
- `src/components/backlog/epic-filter.tsx` deleted.
- `src/components/backlog/kanban-column.tsx` deleted (replaced by matrix cells rendered inline on the page).
- `src/components/backlog/kanban-card.tsx` — add `hideEpicChip` prop; rest unchanged.
- `src/components/layout/nav-links.tsx` — label rename + link removal.
- `src/app/backlog/page.tsx` — rewritten around the matrix model.

## Error handling

- Drop failure → optimistic rollback + `alert(err.error ?? "Fehler")`.
- Epic modal mutations → `alert` on non-2xx (consistent with current pattern).
- No new error surfaces.

## Testing

**Unit / integration:**
- Extend `src/lib/db/epics.test.ts` only if we add service functions; the plan does NOT add new service functions, so no new tests there.
- Add a small client-side helper module (e.g., `src/lib/backlog/grouping.ts`) that computes `EpicRow[]` from `epics` + `items` + filter + collapse state. Test with vitest — pure function, easy to cover.
- Tests to add:
  - Grouping produces one row per epic with correct cell splits.
  - Priority filter excludes items from cells.
  - Orphans row is included when non-empty, excluded when empty.
  - Sort: critical before high before medium before low.
  - Tiebreak by `sortOrder`.
  - Orphans forced to the bottom regardless of priority.
  - Collapse state from URL param: `?epic=EPIC-002` returns only that epic expanded.

**Manual (browser) verification:**
- Drop a card into an empty cell of a different epic — status AND epic both change.
- Same-cell drop is a no-op (no network request).
- Drop failure path (simulate by temporarily pointing `/api/backlog` to return 500) — card snaps back.
- Collapsed rows ignore drops.
- Clicking a card opens the edit modal; dragging a card and releasing does NOT open the modal.
- "Epics verwalten" modal: create, edit, delete an epic; delete reassigns items and they appear in Orphans row.
- Orphans row only appears when an epic with items existed in Orphans.
- Deep link `?epic=EPIC-002` expands only that epic.

## Files

### Added
- `src/lib/backlog/grouping.ts` — pure grouping/sorting helper.
- `src/lib/backlog/grouping.test.ts` — vitest.
- `src/components/backlog/dev-todos-matrix.tsx` — the matrix grid component.
- `src/components/backlog/epic-row.tsx` — one row (expanded or collapsed).
- `src/components/backlog/manage-epics-modal.tsx` — the "Epics verwalten" modal.

### Modified
- `src/app/backlog/page.tsx` — rewritten to render `DevTodosMatrix` and the modal.
- `src/components/backlog/kanban-card.tsx` — add `hideEpicChip?: boolean`.
- `src/components/layout/nav-links.tsx` — label rename + remove "Epics" link; simplify `isActive`.

### Deleted
- `src/app/backlog/epics/page.tsx`
- `src/components/backlog/epic-card.tsx`
- `src/components/backlog/epic-filter.tsx`
- `src/components/backlog/kanban-column.tsx`
- `src/components/backlog/add-epic-form.tsx` (inlined into the modal)

## Out of scope (YAGNI)

- Keyboard drag-and-drop.
- Reordering epics via drag on the row (sortOrder stays set at creation; reorder-by-drag is a separate feature).
- Multi-select / bulk reassign.
- URL write-back when toggling collapse manually.
- Empty state for "zero epics" (impossible — Orphans is always created by seed).
- Color-coded epic rows, animations beyond simple opacity/border feedback.

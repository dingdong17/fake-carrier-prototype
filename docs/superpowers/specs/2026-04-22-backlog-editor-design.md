# Backlog Editor + Categories — Design

**Status:** Draft · **Date:** 2026-04-22 · **Author:** Don (with Claude)

## Purpose

The backlog page (`/backlog`, admin-only Kanban) currently supports
create + drag-to-change-status only. Make items **editable in place**
(title, description, priority, status, optional category), sort
cards **within each status column by priority**, filter by **category**
in addition to priority, and let admins **delete** items with
confirmation.

## Scope

**In scope**

- Sort items within each of the 3 status columns by priority:
  Kritisch → Hoch → Mittel → Niedrig → (ties broken by `createdAt DESC`).
- New **category** field on `backlog_items`:
  - Enum values: `ui`, `ai_chat`, `ai_analytics`, `external_api`,
    `client_credits`, `security_rbac`, `infrastructure`.
  - Nullable (existing + uncategorized items stay null).
- Small grey category tag rendered next to priority on each card
  (null category = no tag).
- Second filter dropdown on `/backlog`: "Alle Kategorien" / each of the
  7 labels / "Ohne Kategorie". Combines with priority filter via AND.
- Edit modal opened by clicking a card — edits title, description,
  priority, status, category; single "Speichern" primary action.
- Delete from inside the edit modal, two-step in-modal confirmation.
- `POST /api/backlog` extended: `action: "update"` accepts `category`;
  `action: "create"` accepts optional `category`; new `action: "delete"`.
- Drizzle migration for the new column.

**Out of scope**

- Manual reordering of cards within a priority group (priority-sort is
  deterministic; drag-and-drop reorder is a future feature).
- Keyboard shortcuts (Esc / Enter) in the modal.
- Audit log of edits and deletes.
- Category backfill on existing items — each can be categorized
  through the new UI if/when needed.

## Architecture

**Data model**

- Add `category` column to `backlog_items` (Drizzle):
  ```ts
  category: text("category", {
    enum: [
      "ui",
      "ai_chat",
      "ai_analytics",
      "external_api",
      "client_credits",
      "security_rbac",
      "infrastructure",
    ],
  }),
  ```
  No default, nullable. Existing rows stay `NULL`.
- `drizzle-kit generate` emits one ALTER TABLE migration. Safe — add
  column with no default.
- No change to the `priority` enum; `critical` already exists.

**Sort**

- Pure function `sortByPriority(items)` in `src/lib/backlog/sort.ts`.
  Returns a new array ordered by priority rank then `createdAt DESC`.
  Tested as pure logic; no DOM or API coupling.

**Labels**

- Consolidate German display labels in `src/lib/backlog/labels.ts`:
  `PRIORITY_LABELS`, `STATUS_LABELS`, `CATEGORY_LABELS`. Removes the
  existing duplication between `kanban-card.tsx` and `page-client.tsx`.

**UI components**

- `src/components/backlog/kanban-card.tsx` — add small grey category
  tag next to the priority badge when `item.category !== null`;
  gain `onClick` prop that opens the edit modal. Drag handlers
  unchanged.
- `src/components/backlog/kanban-column.tsx` — no structural change;
  callers pass already-sorted items.
- `src/components/backlog/edit-item-modal.tsx` — NEW client component.
  Overlay modal (z-indexed fixed wrapper with backdrop). Props:
  `{ item, onSave, onDelete, onClose }`. Local state for each field.
  Two-step delete: `deleteArmed: boolean` in the modal's own state.
- `src/app/backlog/page-client.tsx` — add category-filter state, open
  modal state (`editingItem: BacklogItem | null`), sort + filter
  composition, and the API call wiring for save / delete.
- `src/components/backlog/add-item-form.tsx` — add a category select
  (default "— (keine) —"), pass through to the create API call.

**API**

- `src/app/api/backlog/route.ts` (POST):
  - `action: "create"` — accept optional `category` (validate against
    enum; null if absent or empty string).
  - `action: "update"` — accept `category` (allow explicit null).
  - **NEW** `action: "delete"` — `{ action: "delete", id }` →
    `DELETE FROM backlog_items WHERE id = ?`. Admin-only (existing gate).

## Data flows

**A. View** — page loads → `GET /api/backlog` → client state → filters
applied → `sortByPriority` per column → render.

**B. Create** — existing flow; add category to the payload.

**C. Click card → edit** — `onClick` sets `editingItem`; modal renders
with a local copy of the item's fields.

**D. Save** — `POST /api/backlog` with `action: "update"` and the full
edited fields. On 200, update local state and close modal. On failure,
surface an inline error inside the modal and keep it open.

**E. Delete (two-step)** — Click "Löschen" → `deleteArmed = true` →
footer swaps to a red confirm bar. **[Ja, löschen]** → `POST` with
`action: "delete"` → remove from state, close modal. **[Abbrechen]**
(inside the armed bar) → `deleteArmed = false`, footer reverts.

**F. Drag status change** — unchanged from today.

## Error handling

- API errors from save/delete → inline red banner inside the modal:
  "Speichern fehlgeschlagen. Bitte erneut versuchen." / "Löschen
  fehlgeschlagen. …". Modal stays open so the admin can retry.
- Network error on initial page load → existing page-level handling
  unchanged.
- Schema enum violation impossible from the UI (selects + null only),
  but the API validates `category` against the enum and rejects with
  400 otherwise.

## Testing

**Unit tests** (Vitest):

- `src/lib/backlog/sort.test.ts` — `sortByPriority`:
  - All four priorities present in random order → sorted rank.
  - Ties by priority → newer `createdAt` first.
  - Empty array → empty.
  - Single item → unchanged.
  - Does not mutate input.
- `src/app/api/backlog/route.test.ts` (NEW; file does not exist):
  - `action: "create"` round-trips `category`.
  - `action: "update"` updates `category`; explicit null clears it.
  - `action: "delete"` removes the row.
  - Non-admin session → 403 on all three.
  - Delete for a missing id → 404 (or 200 no-op; plan picks one).

**Smoke test** (manual, after deploy):

1. `/backlog` loads; existing items visible in status columns sorted
   by priority.
2. Click card → edit modal opens with current values.
3. Change priority → save → card moves to the right spot within the
   column (or across columns if status changed).
4. Set category → save → grey tag appears on card; filter by category
   narrows the set correctly.
5. Delete → two-step confirm works; card vanishes; refresh confirms
   the row is gone in Turso.
6. Non-admin (broker or client account) → `/backlog` redirects or 403s
   as today.

## Files touched

**New**

- `src/lib/backlog/sort.ts`
- `src/lib/backlog/sort.test.ts`
- `src/lib/backlog/labels.ts`
- `src/components/backlog/edit-item-modal.tsx`
- `src/app/api/backlog/route.test.ts`
- One new Drizzle migration file under `drizzle/`

**Modified**

- `src/lib/db/schema.ts` — add `category` to `backlog_items` + export
  `BacklogCategory` type.
- `src/app/api/backlog/route.ts` — create/update accept `category`;
  add delete action.
- `src/app/backlog/page-client.tsx` — category filter, sort, modal
  wiring; remove inline priority-label duplication.
- `src/components/backlog/kanban-card.tsx` — category tag, onClick.
- `src/components/backlog/add-item-form.tsx` — category select.

## Open questions for implementation

Resolved during brainstorm; none left open.

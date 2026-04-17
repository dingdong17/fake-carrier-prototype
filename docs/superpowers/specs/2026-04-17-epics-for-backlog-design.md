# Epics for Backlog — Design Spec

**Date:** 2026-04-17
**Status:** Approved, ready for implementation planning
**Scope:** Extend the existing backlog Kanban with Epics as parents of BL items.

## Purpose

The backlog currently shows 15 flat items in a 3-column Kanban. As more items land, related work (external registries, deployment, monetization, advanced detection) becomes hard to aggregate for stakeholder conversations. Epics group related BL items under a shared theme and let us report progress at a theme level without losing the item-level Kanban.

## Decisions

| # | Decision |
|---|---|
| 1 | Epic is a tracked object with its own `status` and `priority` (same enums as items). |
| 2 | Epic number format: `EPIC-001`, `EPIC-002`, … (parallel to `BL-NNN`). |
| 3 | No color, no target date. |
| 4 | Every BL item **must** have an epic. A protected `Orphans` epic (`EPIC-001`) is the fallback. |
| 5 | UI: Epic filter + badge on the existing Kanban **and** a dedicated `/backlog/epics` overview page. |
| 6 | Seed script pre-creates 8 epics and assigns the 15 existing items. |
| 7 | Inline epic create/edit on the Epics page; epic selector in the item add/edit form; deleting an epic reassigns its items to Orphans. |

## Schema

### New table `epics`

```ts
epics {
  id:          text PK
  itemNumber:  text UNIQUE          // "EPIC-001"
  title:       text NOT NULL
  description: text NULL
  priority:    enum(critical|high|medium|low) NOT NULL
  status:      enum(backlog|in_progress|done) NOT NULL DEFAULT 'backlog'
  sortOrder:   int NOT NULL DEFAULT 0
  isProtected: int NOT NULL DEFAULT 0   // 1 for Orphans; blocks delete and edit
  createdAt:   text NOT NULL
  updatedAt:   text NOT NULL
}
```

### Change to `backlog_items`

Add `epic_id TEXT NOT NULL REFERENCES epics(id)`.

Drizzle schema types (`BacklogItem`, `NewBacklogItem`) will reflect the new column automatically; a new `Epic` / `NewEpic` pair is added.

### Migration

Follows the existing `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` pattern in `src/lib/db/seed.ts` — no Drizzle migrations yet.

1. `CREATE TABLE IF NOT EXISTS epics (...)`.
2. Ensure `Orphans` epic exists (`EPIC-001`, `isProtected=1`). Insert only if absent.
3. Add `epic_id` to `backlog_items` idempotently — query `PRAGMA table_info(backlog_items)` and `ALTER TABLE` only if the column is missing.
4. Backfill: `UPDATE backlog_items SET epic_id = <Orphans.id> WHERE epic_id IS NULL`.
5. Application code enforces referential integrity (SQLite FKs are off by default in this project).

## Seed epics

Run after table creation. Each assigns the matching items from the existing 15-item seed.

| # | Epic | Items |
|---|---|---|
| EPIC-001 | Orphans (protected) | — (fallback) |
| EPIC-002 | External Registries | VIES, KREPTD, BALM, "KRS, CEIDG, ONRC, ARR, RPSD" |
| EPIC-003 | Deployment & Hosting | Vercel+Turso, Azure persistence |
| EPIC-004 | Monetization & Access | MS Entra Azure auth, Multi-tenant billing |
| EPIC-005 | Integrations | TIMOCOM, Blacklist DB |
| EPIC-006 | Advanced Detection | Vehicle photo analysis, Graph analysis, Agent-to-Agent |
| EPIC-007 | Rebrand | SCHUNCK rebrand |
| EPIC-008 | Feedback Loop | User feedback collection |

Seeding is idempotent: if `epics` already has rows, skip seeding (matches the current behaviour of `seed.ts`). Backfill (step 4 above) still runs for safety.

## API

### New route `src/app/api/epics/route.ts`

- **`GET /api/epics`** → `{ epics: EpicWithProgress[] }`
  - Each epic includes `progress: { total, done, inProgress }` — a single `GROUP BY epic_id` aggregation on `backlog_items`.
- **`POST /api/epics`** with body `{ action, ... }`:
  - `action: "create"` — body `{ title, priority, description? }`. Server assigns next `EPIC-NNN` (max+1 pattern, same as `BL-NNN`). Status defaults to `backlog`.
  - `action: "update"` — body `{ id, title?, description?, priority?, status?, sortOrder? }`. Rejects any update on a protected epic with 400 "Dieses Epic kann nicht bearbeitet werden".
  - `action: "delete"` — body `{ id }`. Rejects protected epic with 400 "Dieses Epic kann nicht gelöscht werden". Otherwise wraps reassign-to-Orphans + delete in a single `db.transaction(...)`.

### Changes to `src/app/api/backlog/route.ts`

- `GET` already returns all columns via `select()`; `epicId` appears automatically.
- `POST action=create` — now requires `epicId`; 400 "Epic ist erforderlich" if missing, 400 "Epic nicht gefunden" if it does not exist.
- `POST action=update` — accepts `epicId` for reassignment, validated the same way.

## UI

### New page `/backlog/epics` (`src/app/backlog/epics/page.tsx`)

- Client component. Fetches `/api/epics` on mount.
- Grid of epic cards sorted by `sortOrder`. Each card shows: `EPIC-NNN` mono tag, title, priority badge, status pill, description, progress bar with `3/7 erledigt` label, and a "Öffnen" link to `/backlog?epic=EPIC-NNN`.
- Inline "+ Neues Epic" form mirrors `AddItemForm` (title, description, priority).
- Edit/delete icons on each non-protected card. The Orphans card shows a small "Geschützt" label instead of delete.

### New components

- `src/components/backlog/epic-card.tsx` — the card above.
- `src/components/backlog/add-epic-form.tsx` — near-copy of `AddItemForm` without the status field.
- `src/components/backlog/edit-item-modal.tsx` — edit an item's title, description, priority, and epic. Opened by clicking a Kanban card.
- `src/components/backlog/epic-filter.tsx` — small shared dropdown (loads epics from `/api/epics`).

### Changes to existing files

- `src/app/backlog/page.tsx` — add an Epic filter next to the priority filter (both combine AND). Reads `?epic=EPIC-NNN` from URL to pre-select. Opens the edit modal when a card is clicked. Passes the item's epic (looked up client-side from the epics list) into `KanbanCard`.
- `src/components/backlog/kanban-card.tsx` — accept `epic: { itemNumber, title } | null`; render a muted chip line (`EPIC-002 · External Registries`) under the title. No background color per decision #3.
- `src/components/backlog/add-item-form.tsx` — required Epic select above the priority select, loaded from `/api/epics`, default = Orphans.
- `src/lib/utils.ts` — add `formatEpicNumber(n)` mirroring `formatBacklogNumber`.
- Nav: add "Epics" link in the backlog layout/header next to "Backlog" so both views are reachable.

## Error handling

- **Item create/update without valid `epicId`** → 400 with German message (`"Epic ist erforderlich"` / `"Epic nicht gefunden"`).
- **Delete protected epic** → 400 `"Dieses Epic kann nicht gelöscht werden"`.
- **Edit protected epic** → 400 `"Dieses Epic kann nicht bearbeitet werden"`.
- **Epic delete** → single `db.transaction(...)` (better-sqlite3 sync API) — reassign items then delete. Any throw rolls the whole thing back.
- **UI** — optimistic updates with rollback on non-2xx, matching the existing drag pattern.

## Testing

Vitest is already wired up (`vitest.config.ts`).

**Unit**
- `formatEpicNumber(7)` → `"EPIC-007"`.

**Integration (in-memory sqlite)**
- Epic CRUD happy path.
- Item create rejected without `epicId` / with unknown `epicId`.
- Epic delete reassigns items to Orphans and removes the epic.
- Orphans cannot be deleted or edited.
- `EPIC-NNN` counter is contiguous across creates (no gaps from max+1 logic).
- Backfill: starting from a DB with items that have `epic_id IS NULL`, running the seed assigns all of them to Orphans.

**Manual verification (per project rule: run dev server before reporting done)**
- Create an epic, reassign an item, delete an epic, confirm items land in Orphans, confirm Orphans cannot be deleted/edited.

## Files

**Added (6)**
- `src/app/backlog/epics/page.tsx`
- `src/app/api/epics/route.ts`
- `src/components/backlog/epic-card.tsx`
- `src/components/backlog/add-epic-form.tsx`
- `src/components/backlog/edit-item-modal.tsx`
- `src/components/backlog/epic-filter.tsx`

**Changed (7)**
- `src/lib/db/schema.ts` — add `epics` table, `epicId` on `backlogItems`, `Epic` / `NewEpic` types.
- `src/lib/db/seed.ts` — create `epics` table, seed 8 epics, assign items, backfill step.
- `src/lib/utils.ts` — `formatEpicNumber`.
- `src/app/backlog/page.tsx` — epic filter, chip on cards, edit-modal open on click.
- `src/app/api/backlog/route.ts` — require/validate `epicId`.
- `src/components/backlog/add-item-form.tsx` — epic selector.
- `src/components/backlog/kanban-card.tsx` — epic chip line.

## Out of scope (YAGNI)

- Color coding for epics.
- Target dates / owners on epics.
- Many-to-many items-to-epics.
- Drag-to-reassign items between epics.
- Epic-level reordering beyond `sortOrder` inserts.
- Drizzle migrations (project still uses `CREATE TABLE IF NOT EXISTS` in seed).

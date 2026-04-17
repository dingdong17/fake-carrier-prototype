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

  // Apply URL ?epic= once per param change (NOT on every epics refetch).
  const appliedEpicParam = useRef<string | null>(null);
  useEffect(() => {
    if (epics.length === 0) return;
    if (appliedEpicParam.current === epicParam) return;
    appliedEpicParam.current = epicParam;

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

    const original = item;
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
      setItems((prev) => prev.map((i) => (i.id === id ? original : i)));
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
    const original = items.find((i) => i.id === updates.id);
    if (!original) return;
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
      setItems((prev) => prev.map((i) => (i.id === updates.id ? original : i)));
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
            + Neuer Eintrag
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
        onClose={() => setManageOpen(false)}
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

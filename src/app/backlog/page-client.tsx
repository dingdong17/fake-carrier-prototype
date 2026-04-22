"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { KanbanColumn } from "@/components/backlog/kanban-column";
import { AddItemForm } from "@/components/backlog/add-item-form";
import {
  EditItemModal,
  type EditableItem,
} from "@/components/backlog/edit-item-modal";
import { sortByPriority } from "@/lib/backlog/sort";
import {
  CATEGORY_LABELS,
  CATEGORY_VALUES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  type Priority,
  type Status,
} from "@/lib/backlog/labels";
import type { BacklogCategory } from "@/lib/db/schema";

interface BacklogItem {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  category: BacklogCategory | null;
  createdAt: string;
  sortOrder: number;
}

const COLUMNS: { status: Status; title: string }[] = [
  { status: "backlog", title: STATUS_LABELS.backlog },
  { status: "in_progress", title: STATUS_LABELS.in_progress },
  { status: "done", title: STATUS_LABELS.done },
];

export default function BacklogPageClient() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/backlog");
    const data = await res.json();
    setItems(data.items);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(_e: React.DragEvent, newStatus: string) {
    if (!draggedId) return;
    const id = draggedId;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: newStatus as Status } : it
      )
    );
    setDraggedId(null);
    await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, status: newStatus }),
    });
  }

  async function handleAdd(
    title: string,
    priority: string,
    description: string,
    category: BacklogCategory | null
  ) {
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, priority, description, category }),
    });
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
  }

  async function handleSave(updated: EditableItem) {
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: updated.id,
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        status: updated.status,
        category: updated.category,
      }),
    });
    if (!res.ok) throw new Error("Save failed");
    setItems((prev) =>
      prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it))
    );
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) throw new Error("Delete failed");
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (priorityFilter !== "all" && i.priority !== priorityFilter) return false;
      if (categoryFilter !== "all") {
        if (categoryFilter === "none" && i.category !== null) return false;
        if (categoryFilter !== "none" && i.category !== categoryFilter) return false;
      }
      return true;
    });
  }, [items, priorityFilter, categoryFilter]);

  const editingItem = editingId ? items.find((it) => it.id === editingId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-barlow text-3xl font-semibold text-ec-dark-blue">Backlog</h1>
        <div className="flex gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
          >
            <option value="all">Alle Prioritäten</option>
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
          >
            <option value="all">Alle Kategorien</option>
            <option value="none">Ohne Kategorie</option>
            {CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AddItemForm onAdd={handleAdd} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            items={sortByPriority(
              filteredItems.filter((i) => i.status === col.status)
            )}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onItemClick={(id) => setEditingId(id)}
          />
        ))}
      </div>

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

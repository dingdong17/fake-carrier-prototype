"use client";

import { useEffect, useState, useCallback } from "react";
import { KanbanColumn } from "@/components/backlog/kanban-column";
import { AddItemForm } from "@/components/backlog/add-item-form";

interface BacklogItem {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  sortOrder: number;
}

const columns = [
  { status: "backlog", title: "Backlog" },
  { status: "in_progress", title: "In Arbeit" },
  { status: "done", title: "Erledigt" },
];

export default function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

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

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === draggedId
          ? { ...item, status: newStatus as BacklogItem["status"] }
          : item
      )
    );
    setDraggedId(null);

    await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: draggedId, status: newStatus }),
    });
  }

  async function handleAdd(title: string, priority: string, description: string) {
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, priority, description }),
    });
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
  }

  const filteredItems =
    filter === "all" ? items : items.filter((i) => i.priority === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-barlow text-3xl font-semibold text-ec-dark-blue">
          Backlog
        </h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        >
          <option value="all">Alle Prioritäten</option>
          <option value="critical">Kritisch</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </select>
      </div>

      <AddItemForm onAdd={handleAdd} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            items={filteredItems.filter((i) => i.status === col.status)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}

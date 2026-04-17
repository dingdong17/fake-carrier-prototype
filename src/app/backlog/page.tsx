"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanColumn } from "@/components/backlog/kanban-column";
import { AddItemForm } from "@/components/backlog/add-item-form";
import { EpicFilter } from "@/components/backlog/epic-filter";
import { EditItemModal } from "@/components/backlog/edit-item-modal";

interface BacklogItem {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "backlog" | "in_progress" | "done";
  sortOrder: number;
  epicId: string;
}

interface Epic {
  id: string;
  itemNumber: string;
  title: string;
  isProtected: number;
}

const columns = [
  { status: "backlog", title: "Backlog" },
  { status: "in_progress", title: "In Arbeit" },
  { status: "done", title: "Erledigt" },
];

function BacklogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const epicParam = searchParams.get("epic") ?? "all";

  const [items, setItems] = useState<BacklogItem[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

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

  function setEpicFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("epic");
    } else {
      params.set("epic", value);
    }
    const qs = params.toString();
    router.replace(qs ? `/backlog?${qs}` : "/backlog");
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(_e: React.DragEvent, newStatus: string) {
    if (!draggedId) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === draggedId
          ? { ...item, status: newStatus as BacklogItem["status"] }
          : item,
      ),
    );
    const id = draggedId;
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
    epicId: string,
  ) {
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, priority, description, epicId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
    await fetchEpics(); // progress refresh
  }

  async function handleSaveEdit(updates: {
    id: string;
    title: string;
    description: string;
    priority: string;
    epicId: string;
  }) {
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ...updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === updates.id
          ? {
              ...i,
              title: updates.title,
              description: updates.description,
              priority: updates.priority as BacklogItem["priority"],
              epicId: updates.epicId,
            }
          : i,
      ),
    );
    setEditingId(null);
    await fetchEpics();
  }

  const epicById = new Map(epics.map((e) => [e.id, e]));
  const epicByNumber = new Map(epics.map((e) => [e.itemNumber, e]));
  const epicFilterValue = epicParam;
  const selectedEpic = epicFilterValue !== "all" ? epicByNumber.get(epicFilterValue) : null;

  const filtered = items.filter((i) => {
    if (priorityFilter !== "all" && i.priority !== priorityFilter) return false;
    if (selectedEpic && i.epicId !== selectedEpic.id) return false;
    return true;
  });

  const decoratedItems = filtered.map((i) => {
    const epic = epicById.get(i.epicId);
    return {
      ...i,
      epic: epic ? { itemNumber: epic.itemNumber, title: epic.title } : null,
    };
  });

  const orphans = epics.find((e) => e.isProtected === 1);
  const defaultEpicId = orphans?.id ?? epics[0]?.id ?? "";
  const editingItem = editingId ? items.find((i) => i.id === editingId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-barlow text-3xl font-semibold text-ec-dark-blue">
          Backlog
        </h1>
        <div className="flex gap-2">
          <EpicFilter
            epics={epics.map((e) => ({ id: e.id, itemNumber: e.itemNumber, title: e.title }))}
            value={epicFilterValue}
            onChange={setEpicFilter}
          />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          >
            <option value="all">Alle Prioritäten</option>
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
        </div>
      </div>

      <AddItemForm
        epics={epics.map((e) => ({ id: e.id, itemNumber: e.itemNumber, title: e.title }))}
        defaultEpicId={selectedEpic?.id ?? defaultEpicId}
        onAdd={handleAdd}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            items={decoratedItems.filter((i) => i.status === col.status)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onCardClick={(id) => setEditingId(id)}
          />
        ))}
      </div>

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

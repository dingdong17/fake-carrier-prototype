"use client";

import { useCallback, useEffect, useState } from "react";
import { EpicCard } from "@/components/backlog/epic-card";
import { AddEpicForm } from "@/components/backlog/add-epic-form";

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

export default function EpicsPage() {
  const [epics, setEpics] = useState<Epic[]>([]);

  const fetchEpics = useCallback(async () => {
    const res = await fetch("/api/epics");
    const data = await res.json();
    setEpics(data.epics);
  }, []);

  useEffect(() => {
    fetchEpics();
  }, [fetchEpics]);

  async function handleAdd(title: string, priority: string, description: string) {
    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, priority, description }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    await fetchEpics();
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Fehler" }));
      alert(err.error ?? "Fehler");
      return;
    }
    await fetchEpics();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-barlow text-3xl font-semibold text-ec-dark-blue">
          Epics
        </h1>
      </div>

      <AddEpicForm onAdd={handleAdd} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {epics.map((epic) => (
          <EpicCard key={epic.id} epic={epic} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

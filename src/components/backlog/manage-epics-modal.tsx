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
                          Protected
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

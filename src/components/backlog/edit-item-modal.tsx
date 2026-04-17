"use client";

import { useEffect, useState } from "react";

interface EpicOption {
  id: string;
  itemNumber: string;
  title: string;
}

interface EditItemModalProps {
  item: {
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: "critical" | "high" | "medium" | "low";
    epicId: string;
  } | null;
  epics: EpicOption[];
  onClose: () => void;
  onSave: (updates: {
    id: string;
    title: string;
    description: string;
    priority: string;
    epicId: string;
  }) => void;
}

export function EditItemModal({ item, epics, onClose, onSave }: EditItemModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [epicId, setEpicId] = useState("");

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setPriority(item.priority);
      setEpicId(item.epicId);
    }
  }, [item]);

  if (!item) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item || !title.trim() || !epicId) return;
    onSave({
      id: item.id,
      title: title.trim(),
      description: description.trim(),
      priority,
      epicId,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-barlow text-lg font-semibold text-ec-dark-blue">
            {item.itemNumber} bearbeiten
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
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-ec-grey-80">Epic</span>
            <select
              value={epicId}
              onChange={(e) => setEpicId(e.target.value)}
              className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
            >
              {epics.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.itemNumber} · {ep.title}
                </option>
              ))}
            </select>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
          >
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ec-medium-grey px-4 py-2 text-sm font-medium text-ec-grey-80 transition-colors hover:bg-ec-light-grey"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

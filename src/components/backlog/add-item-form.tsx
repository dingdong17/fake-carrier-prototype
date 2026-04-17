"use client";

import { useState } from "react";

interface EpicOption {
  id: string;
  itemNumber: string;
  title: string;
}

interface AddItemFormProps {
  epics: EpicOption[];
  defaultEpicId: string;
  onAdd: (
    title: string,
    priority: string,
    description: string,
    epicId: string,
  ) => void;
}

export function AddItemForm({ epics, defaultEpicId, onAdd }: AddItemFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [epicId, setEpicId] = useState(defaultEpicId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !epicId) return;
    onAdd(title.trim(), priority, description.trim(), epicId);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setEpicId(defaultEpicId);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-ec-medium-grey p-3 text-sm font-medium text-ec-grey-80 transition-colors hover:border-ec-dark-blue hover:text-ec-dark-blue"
      >
        + Neuer Eintrag
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-ec-medium-grey bg-white p-4 shadow-sm"
    >
      <div className="space-y-3">
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
        <input
          type="text"
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
        />
        <textarea
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue placeholder:text-ec-grey-80 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
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
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ec-light-blue"
        >
          Hinzufügen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ec-medium-grey px-4 py-2 text-sm font-medium text-ec-grey-80 transition-colors hover:bg-ec-light-grey"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

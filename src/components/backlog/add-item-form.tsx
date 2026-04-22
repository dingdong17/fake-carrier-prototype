"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_VALUES,
  PRIORITY_LABELS,
  type Priority,
} from "@/lib/backlog/labels";
import type { BacklogCategory } from "@/lib/db/schema";

interface AddItemFormProps {
  onAdd: (
    title: string,
    priority: string,
    description: string,
    category: BacklogCategory | null
  ) => void;
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState<BacklogCategory | "">("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(
      title.trim(),
      priority,
      description.trim(),
      (category || null) as BacklogCategory | null
    );
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("");
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
        <input
          type="text"
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
        />
        <textarea
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
          >
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BacklogCategory | "")}
            className="w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
          >
            <option value="">— Keine Kategorie —</option>
            {CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white"
        >
          Hinzufügen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ec-medium-grey px-4 py-2 text-sm font-medium text-ec-grey-80"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

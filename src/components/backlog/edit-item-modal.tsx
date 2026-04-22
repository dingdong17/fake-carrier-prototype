"use client";

import { useEffect, useRef, useState } from "react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  CATEGORY_LABELS,
  CATEGORY_VALUES,
  type Priority,
  type Status,
} from "@/lib/backlog/labels";
import type { BacklogCategory } from "@/lib/db/schema";

export interface EditableItem {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  category: BacklogCategory | null;
}

interface Props {
  item: EditableItem;
  onSave: (updated: EditableItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function EditItemModal({ item, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [status, setStatus] = useState<Status>(item.status);
  const [category, setCategory] = useState<BacklogCategory | "">(item.category ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Titel darf nicht leer sein.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...item,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
        category: (category || null) as BacklogCategory | null,
      });
      onClose();
    } catch {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(item.id);
      onClose();
    } catch {
      setError("Löschen fehlgeschlagen. Bitte erneut versuchen.");
      setDeleting(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <form
        onSubmit={handleSave}
        className="w-full max-w-lg rounded-xl border border-ec-medium-grey bg-white shadow-xl"
      >
        <header className="border-b border-ec-medium-grey px-5 py-3">
          <div className="font-mono text-xs text-ec-grey-80">{item.itemNumber}</div>
          <div className="text-sm font-semibold text-ec-dark-blue">{item.title}</div>
        </header>

        <div className="space-y-3 px-5 py-4">
          {error && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-medium text-ec-grey-80">Titel</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-ec-grey-80">Beschreibung</span>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ec-grey-80">Priorität</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
              >
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ec-grey-80">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
              >
                {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-ec-grey-80">Kategorie</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BacklogCategory | "")}
              className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue"
            >
              <option value="">— (keine) —</option>
              {CATEGORY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {deleteArmed ? (
          <div className="flex items-center justify-between gap-3 border-t border-red-200 bg-red-50 px-5 py-3">
            <span className="text-sm text-red-800">
              Wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteArmed(false)}
                disabled={deleting}
                className="rounded-lg border border-ec-medium-grey bg-white px-3 py-1.5 text-sm font-medium text-ec-grey-80"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Löscht…" : "Ja, löschen"}
              </button>
            </div>
          </div>
        ) : (
          <footer className="flex items-center justify-between gap-3 border-t border-ec-medium-grey px-5 py-3">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Speichert…" : "Speichern"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-ec-medium-grey bg-white px-4 py-2 text-sm font-medium text-ec-grey-80"
              >
                Abbrechen
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDeleteArmed(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Löschen
            </button>
          </footer>
        )}
      </form>
    </div>
  );
}

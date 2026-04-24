"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props =
  | {
      mode: "create";
      initial?: undefined;
    }
  | {
      mode: "edit";
      initial: {
        id: string;
        startsAt: string;
        endsAt: string;
        maxAttendees: number;
        isActive: boolean;
        notes: string | null;
      };
    };

function toLocalDatetimeInput(iso: string): string {
  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function WebinarSlotForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : undefined;
  const [startsAt, setStartsAt] = useState(
    initial ? toLocalDatetimeInput(initial.startsAt) : ""
  );
  const [endsAt, setEndsAt] = useState(
    initial ? toLocalDatetimeInput(initial.endsAt) : ""
  );
  const [maxAttendees, setMaxAttendees] = useState(initial?.maxAttendees ?? 50);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const body = {
            startsAt: new Date(startsAt).toISOString(),
            endsAt: new Date(endsAt).toISOString(),
            maxAttendees: Number(maxAttendees),
            isActive,
            notes: notes.trim() || null,
          };
          const url =
            props.mode === "create"
              ? "/api/admin/webinars"
              : `/api/admin/webinars/${props.initial.id}`;
          const method = props.mode === "create" ? "POST" : "PATCH";
          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j.error ?? "Fehler beim Speichern");
            return;
          }
          router.push("/admin/webinars");
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">Beginn</span>
        <input
          type="datetime-local"
          required
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Ende</span>
        <input
          type="datetime-local"
          required
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Maximale Teilnehmerzahl</span>
        <input
          type="number"
          min={1}
          required
          value={maxAttendees}
          onChange={(e) => setMaxAttendees(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span className="text-sm">Aktiv (auf Landing-Page sichtbar)</span>
      </label>
      <label className="block">
        <span className="text-sm font-medium">Interne Notizen (optional)</span>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      {error && <p className="text-sm text-ec-error">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : props.mode === "create" ? "Anlegen" : "Speichern"}
        </Button>
        {props.mode === "edit" && (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (!confirm("Termin wirklich löschen? Alle Anmeldungen werden mit entfernt.")) {
                return;
              }
              startTransition(async () => {
                const res = await fetch(
                  `/api/admin/webinars/${props.initial.id}`,
                  { method: "DELETE" }
                );
                if (!res.ok) {
                  setError("Löschen fehlgeschlagen");
                  return;
                }
                router.push("/admin/webinars");
                router.refresh();
              });
            }}
          >
            Löschen
          </Button>
        )}
      </div>
    </form>
  );
}

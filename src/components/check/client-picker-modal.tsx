// src/components/check/client-picker-modal.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = { slug: string; name: string; creditBalance: number };

export function ClientPickerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((j) => setClients(j.clients ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.slug.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-ec-dark-blue">
          Kunden auswählen
        </h3>
        <p className="mt-1 text-sm text-ec-grey-70">
          Für welchen Kunden führen Sie diese Prüfung durch?
        </p>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen..."
          className="mt-3 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
        <ul className="mt-3 max-h-80 overflow-y-auto divide-y divide-ec-light-grey">
          {loading && <li className="py-3 text-sm text-ec-grey-70">Wird geladen...</li>}
          {!loading && filtered.length === 0 && (
            <li className="py-3 text-sm text-ec-grey-70">Keine Treffer.</li>
          )}
          {filtered.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                className="flex w-full items-center justify-between py-2 text-left hover:bg-ec-light-grey"
                onClick={() => router.push(`/client/${c.slug}/check`)}
              >
                <span>
                  <strong>{c.name}</strong>
                  <span className="ml-2 font-mono text-xs text-ec-grey-70">
                    {c.slug}
                  </span>
                </span>
                <span className="text-xs text-ec-grey-70">
                  {c.creditBalance} Credits
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

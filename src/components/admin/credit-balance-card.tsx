// src/components/admin/credit-balance-card.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CreditBalanceCard({
  slug,
  initial,
}: {
  slug: string;
  initial: number;
}) {
  const [balance, setBalance] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!editing) {
    return (
      <div className="rounded-xl border border-ec-medium-grey bg-white p-4">
        <p className="text-xs uppercase text-ec-grey-70">Credits</p>
        <p className="mt-1 text-3xl font-bold text-ec-dark-blue">{balance}</p>
        <button
          type="button"
          className="mt-2 text-sm text-ec-info hover:underline"
          onClick={() => setEditing(true)}
        >
          Ändern
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ec-medium-grey bg-white p-4">
      <p className="text-xs uppercase text-ec-grey-70">Credits</p>
      <input
        type="number"
        value={balance}
        min={0}
        onChange={(e) => setBalance(Number(e.target.value))}
        className="mt-1 w-full rounded border border-ec-medium-grey px-2 py-1 text-2xl font-bold"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="rounded bg-ec-dark-blue px-3 py-1 text-sm text-white"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await fetch(`/api/admin/clients/${slug}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creditBalance: balance }),
              });
              if (res.ok) {
                setEditing(false);
                router.refresh();
              }
            })
          }
        >
          Speichern
        </button>
        <button
          type="button"
          className="text-sm text-ec-grey-70"
          onClick={() => {
            setBalance(initial);
            setEditing(false);
          }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

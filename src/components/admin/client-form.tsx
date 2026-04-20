// src/components/admin/client-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creditBalance, setCreditBalance] = useState(100);
  const [firstUserEmail, setFirstUserEmail] = useState("");
  const [firstUserName, setFirstUserName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Auto-derive slug from name while the slug field hasn't been hand-edited
  const autoSlug = (n: string) =>
    n
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await fetch("/api/admin/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              slug,
              creditBalance,
              firstUserEmail,
              firstUserName,
            }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j.error ?? "Fehler beim Speichern");
            return;
          }
          const j = await res.json();
          router.push(`/admin/clients/${j.slug}`);
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">Firmenname</span>
        <input
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug || slug === autoSlug(name)) setSlug(autoSlug(e.target.value));
          }}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Slug (URL-freundlich)</span>
        <input
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm font-mono"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Start-Guthaben (Credits)</span>
        <input
          type="number"
          min={0}
          value={creditBalance}
          onChange={(e) => setCreditBalance(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Erster Benutzer — E-Mail</span>
        <input
          type="email"
          required
          value={firstUserEmail}
          onChange={(e) => setFirstUserEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Erster Benutzer — Name</span>
        <input
          required
          value={firstUserName}
          onChange={(e) => setFirstUserName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      {error && <p className="text-sm text-ec-error">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern..." : "Kunde anlegen"}
      </Button>
    </form>
  );
}

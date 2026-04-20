// src/components/admin/user-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "broker">("broker");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, role }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j.error ?? "Fehler");
            return;
          }
          router.push("/admin/users");
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">E-Mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Rolle</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "broker")}
          className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
        >
          <option value="broker">Broker</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <p className="text-xs text-ec-grey-70">
        Kunden-Benutzer werden beim Anlegen eines neuen Kunden oder in der
        Kunden-Detailansicht erstellt.
      </p>
      {error && <p className="text-sm text-ec-error">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern..." : "Benutzer anlegen"}
      </Button>
    </form>
  );
}

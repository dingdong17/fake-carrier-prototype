// src/app/admin/clients/[slug]/users/new/page.tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AddClientUserPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">
        Benutzer hinzufügen
      </h1>
      <form
        className="max-w-lg space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const res = await fetch("/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email, name, role: "client", clientSlug: params.slug,
              }),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              setError(j.error ?? "Fehler");
              return;
            }
            router.push(`/admin/clients/${params.slug}`);
          });
        }}
      >
        <label className="block">
          <span className="text-sm font-medium">E-Mail</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm" />
        </label>
        {error && <p className="text-sm text-ec-error">{error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern..." : "Benutzer anlegen"}
        </Button>
      </form>
    </main>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Status = "pending_confirm" | "confirmed" | "approved" | "rejected";

export function DemoRequestActions(props: { id: string; status: Status }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = (path: string, body?: unknown) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/demo-requests/${props.id}/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Aktion fehlgeschlagen");
        return;
      }
      router.refresh();
    });
  };

  if (props.status === "approved") {
    return (
      <section className="rounded-lg border border-ec-success/30 bg-ec-success/5 p-4 text-sm">
        Diese Anfrage wurde freigegeben — Login-Link wurde verschickt.
      </section>
    );
  }
  if (props.status === "rejected") {
    return (
      <section className="rounded-lg border border-ec-error/30 bg-ec-error/5 p-4 text-sm">
        Diese Anfrage wurde abgelehnt.
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-ec-medium-grey bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ec-grey-70">
        Entscheidung
      </h2>
      {props.status === "pending_confirm" && (
        <p className="text-sm text-ec-warning">
          Warte auf E-Mail-Bestätigung durch den Interessenten. Freigabe ist
          erst nach Bestätigung möglich.
        </p>
      )}
      <div className="flex gap-3">
        <Button
          type="button"
          disabled={pending || props.status !== "confirmed"}
          onClick={() => call("approve")}
        >
          {pending ? "…" : "Freigeben"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => setShowReject((v) => !v)}
        >
          Ablehnen…
        </Button>
      </div>
      {showReject && (
        <div className="space-y-2">
          <label className="block text-sm">
            <span className="font-medium">Ablehnungsgrund (optional)</span>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ec-medium-grey px-3 py-2 text-sm"
              placeholder="Wird in der Ablehnungs-E-Mail an den Absender mitgeschickt."
            />
          </label>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              call("reject", { reason: rejectionReason || null })
            }
          >
            {pending ? "…" : "Ablehnung absenden"}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-ec-error">{error}</p>}
    </section>
  );
}

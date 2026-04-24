"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  pending_confirm: "Ausstehend",
  confirmed: "Bestätigt",
  waitlist: "Warteliste",
  cancelled: "Storniert",
};

const STATUS_CLASS: Record<string, string> = {
  pending_confirm: "bg-ec-grey-40 text-ec-grey-80",
  confirmed: "bg-ec-success/10 text-ec-success",
  waitlist: "bg-ec-warning/10 text-ec-warning",
  cancelled: "bg-ec-error/10 text-ec-error",
};

const NEXT_STATES: Record<string, Array<{ label: string; value: string }>> = {
  pending_confirm: [
    { label: "→ Bestätigen", value: "confirmed" },
    { label: "→ Warteliste", value: "waitlist" },
    { label: "→ Stornieren", value: "cancelled" },
  ],
  confirmed: [
    { label: "→ Warteliste", value: "waitlist" },
    { label: "→ Stornieren", value: "cancelled" },
  ],
  waitlist: [
    { label: "→ Bestätigen", value: "confirmed" },
    { label: "→ Stornieren", value: "cancelled" },
  ],
  cancelled: [
    { label: "→ Reaktivieren (Warteliste)", value: "waitlist" },
  ],
};

export function RegistrationRow(props: {
  id: string;
  name: string;
  company: string;
  email: string;
  role: string;
  status: "pending_confirm" | "confirmed" | "waitlist" | "cancelled";
  createdAt: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const next = (value: string) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/webinars/registrations/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!res.ok) {
        setError("Fehler");
        return;
      }
      router.refresh();
    });
  };

  return (
    <tr className="border-b border-ec-light-grey">
      <td className="py-2">{props.name}</td>
      <td>{props.company}</td>
      <td className="text-ec-grey-70">{props.email}</td>
      <td className="text-ec-grey-70">{props.role}</td>
      <td>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            STATUS_CLASS[props.status] ?? ""
          }`}
        >
          {STATUS_LABEL[props.status] ?? props.status}
        </span>
        {error && <span className="ml-2 text-xs text-ec-error">{error}</span>}
      </td>
      <td className="text-xs text-ec-grey-70">
        {new Date(props.createdAt).toLocaleDateString("de-DE")}
      </td>
      <td className="text-right text-xs">
        {NEXT_STATES[props.status]?.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={pending}
            onClick={() => next(opt.value)}
            className="ml-2 text-ec-info hover:underline disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </td>
    </tr>
  );
}

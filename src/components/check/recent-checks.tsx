"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Check {
  id: string;
  checkNumber: string;
  carrierName: string;
  recommendation: string | null;
  createdAt: string;
}

const recBadge: Record<string, { variant: "success" | "warning" | "high" | "critical"; label: string }> = {
  approve: { variant: "success", label: "Freigeben" },
  review: { variant: "warning", label: "Prüfen" },
  warning: { variant: "high", label: "Warnung" },
  reject: { variant: "critical", label: "Ablehnen" },
};

interface RecentChecksProps {
  initialChecks: Check[];
}

export function RecentChecks({ initialChecks }: RecentChecksProps) {
  const [checks, setChecks] = useState(initialChecks);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, checkId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (deleting) return;
    setDeleting(checkId);

    try {
      const res = await fetch(`/api/checks?id=${checkId}`, { method: "DELETE" });
      if (res.ok) {
        setChecks((prev) => prev.filter((c) => c.id !== checkId));
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  };

  if (checks.length === 0) {
    return (
      <p className="mt-4 text-sm text-ec-grey-80">
        Noch keine Prüfungen durchgeführt.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-4 divide-y divide-ec-medium-grey">
        {checks.map((check) => {
          const badge = check.recommendation
            ? recBadge[check.recommendation]
            : null;
          return (
            <li key={check.id} className="group">
              <div className="flex items-center justify-between py-3 transition-colors hover:bg-ec-light-grey/50">
                <Link
                  href={`/results/${check.id}`}
                  className="flex flex-1 items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-ec-dark-blue">
                      {check.carrierName}
                    </span>
                    <span className="ml-2 text-sm text-ec-grey-80">
                      {check.checkNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {badge && (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    )}
                    <span className="text-sm text-ec-grey-80">
                      {new Date(check.createdAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={(e) => handleDelete(e, check.id)}
                  disabled={deleting === check.id}
                  className="ml-3 rounded p-1.5 text-ec-grey-70 opacity-0 transition-all hover:bg-ec-error/10 hover:text-ec-error group-hover:opacity-100 disabled:opacity-50"
                  title="Prüfung löschen"
                >
                  {deleting === check.id ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ec-error border-t-transparent" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

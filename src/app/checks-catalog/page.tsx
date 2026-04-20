import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import {
  CHECK_CATALOG,
  getChecksByCategory,
  type CheckCategory,
  type CheckDefinition,
} from "@/lib/catalog/checks";

const CATEGORY_LABELS: Record<CheckCategory, string> = {
  "document-classification": "Dokumenten-Klassifikation",
  "document-extraction": "Dokumenten-Extraktion (KI)",
  "external-registry": "Externe Register",
  forensic: "Forensische Metadatenprüfung",
  osint: "OSINT / Öffentliche Quellen",
  "cross-check": "Dokumentübergreifende Konsistenz",
};

const TIER_LABEL: Record<CheckDefinition["availability"], string> = {
  quick: "Schnell",
  medium: "Standard",
  full: "Vollständig",
};

const TIER_COLOR: Record<CheckDefinition["availability"], string> = {
  quick: "bg-ec-success/10 text-ec-success border-ec-success/20",
  medium: "bg-ec-info/10 text-ec-info border-ec-info/20",
  full: "bg-ec-warning/10 text-ec-warning border-ec-warning/20",
};

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta} Punkte`;
  if (delta < 0) return `${delta} Punkte`;
  return "0 Punkte";
}

function deltaClass(delta: number): string {
  if (delta > 0) return "text-ec-error";
  if (delta < 0) return "text-ec-success";
  return "text-ec-grey-70";
}

function CheckCard({ check }: { check: CheckDefinition }) {
  return (
    <article
      id={check.id}
      className="scroll-mt-24 rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm"
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-barlow text-lg font-semibold text-ec-grey-80">
            {check.name}
          </h3>
          <p className="mt-0.5 text-xs text-ec-grey-70">
            ID: <code className="font-mono">{check.id}</code>
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TIER_COLOR[check.availability]}`}
        >
          Stufe: {TIER_LABEL[check.availability]}
        </span>
      </header>

      <p className="mb-4 text-sm leading-relaxed text-ec-grey-80">
        {check.description}
      </p>

      <div className="mb-4 text-xs text-ec-grey-70">
        <span className="font-medium">Datenquelle:</span> {check.source}
      </div>

      <div className="rounded-lg border border-ec-grey-40 bg-ec-light-grey/50 p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ec-grey-70">
          Auswirkung auf den Risiko-Score
        </h4>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-ec-grey-70">Bestanden</dt>
            <dd className={`font-semibold ${deltaClass(check.scoreImpact.passed.delta)}`}>
              {deltaLabel(check.scoreImpact.passed.delta)}
            </dd>
            {check.scoreImpact.passed.note && (
              <dd className="mt-0.5 text-xs text-ec-grey-70">
                {check.scoreImpact.passed.note}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-ec-grey-70">Gefailed</dt>
            <dd className={`font-semibold ${deltaClass(check.scoreImpact.failed.delta)}`}>
              {deltaLabel(check.scoreImpact.failed.delta)}
            </dd>
            {check.scoreImpact.failed.note && (
              <dd className="mt-0.5 text-xs text-ec-grey-70">
                {check.scoreImpact.failed.note}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-ec-grey-70">Übersprungen</dt>
            <dd className={`font-semibold ${deltaClass(check.scoreImpact.skipped.delta)}`}>
              {deltaLabel(check.scoreImpact.skipped.delta)}
            </dd>
            {check.scoreImpact.skipped.note && (
              <dd className="mt-0.5 text-xs text-ec-grey-70">
                {check.scoreImpact.skipped.note}
              </dd>
            )}
          </div>
        </dl>
      </div>
    </article>
  );
}

export default async function ChecksCatalogPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const categories = Object.keys(CATEGORY_LABELS) as CheckCategory[];
  const groups = categories
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      checks: getChecksByCategory(cat),
    }))
    .filter((g) => g.checks.length > 0);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="font-barlow text-2xl font-bold text-ec-dark-blue">
          Prüfkatalog
        </h1>
        <p className="text-sm text-ec-grey-70">
          Alle Prüfungen, die FakeCarrier durchführt, mit Beschreibung,
          Datenquelle und Auswirkung auf den Risiko-Score. Diese Übersicht ist
          auch für die Weitergabe an Kunden gedacht, damit jede Bewertung
          transparent nachvollziehbar ist.
        </p>
        <p className="text-xs text-ec-grey-70">
          Insgesamt {CHECK_CATALOG.length} Prüfungen dokumentiert.
        </p>
      </header>

      <nav
        aria-label="Kategorien"
        className="flex flex-wrap gap-2 rounded-xl border border-ec-medium-grey bg-white p-3 text-sm"
      >
        {groups.map((g) => (
          <a
            key={g.category}
            href={`#cat-${g.category}`}
            className="rounded-lg border border-ec-medium-grey px-3 py-1.5 text-ec-grey-80 hover:bg-ec-light-grey"
          >
            {g.label}{" "}
            <span className="text-xs text-ec-grey-70">({g.checks.length})</span>
          </a>
        ))}
      </nav>

      {groups.map((g) => (
        <section
          key={g.category}
          id={`cat-${g.category}`}
          className="scroll-mt-24 space-y-4"
        >
          <h2 className="font-barlow text-xl font-semibold text-ec-grey-80">
            {g.label}
          </h2>
          <div className="space-y-4">
            {g.checks.map((c) => (
              <CheckCard key={c.id} check={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

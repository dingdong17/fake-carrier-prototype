import { DOCUMENT_TYPES } from "@/lib/config/document-types";

interface MissingDocsProps {
  providedTypes: string[];
}

export function MissingDocs({ providedTypes }: MissingDocsProps) {
  const allTypes = Object.values(DOCUMENT_TYPES);
  const missing = allTypes.filter((dt) => !providedTypes.includes(dt.id));

  if (missing.length === 0) {
    return (
      <div className="rounded-lg border border-ec-light-green/30 bg-ec-light-green/10 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-ec-dark-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium text-ec-dark-green">
            Alle Dokumenttypen vorhanden
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ec-yellow/30 bg-ec-yellow/10 p-4">
      <h4 className="text-sm font-semibold text-ec-grey-80 mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-ec-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Fehlende Dokumente
      </h4>
      <ul className="space-y-2">
        {missing.map((dt) => (
          <li key={dt.id} className="flex items-center justify-between text-sm">
            <span className="text-ec-grey-80">{dt.labelDe}</span>
            <span className="text-ec-grey-70">
              -{(dt.confidenceWeight * 100).toFixed(0)}% Gewichtung
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

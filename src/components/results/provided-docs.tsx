import { DOCUMENT_TYPES } from "@/lib/config/document-types";

interface ProvidedDoc {
  documentType: string;
  fileName: string;
}

interface ProvidedDocsProps {
  documents: ProvidedDoc[];
}

export function ProvidedDocs({ documents }: ProvidedDocsProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-ec-light-green/30 bg-ec-light-green/10 p-4">
      <h4 className="text-sm font-semibold text-ec-grey-80 mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-ec-dark-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Bereitgestellte Dokumente
      </h4>
      <ul className="space-y-2">
        {documents.map((doc, idx) => {
          const cfg = DOCUMENT_TYPES[doc.documentType];
          const label = cfg?.labelDe ?? "Unbekannter Typ";
          return (
            <li key={`${doc.documentType}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ec-grey-80 truncate">{label}</span>
              <span className="text-ec-grey-70 truncate text-right" title={doc.fileName}>
                {doc.fileName}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

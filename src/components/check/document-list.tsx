import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

export interface UploadedDoc {
  id: string;
  fileName: string;
  mimeType: string;
  documentType: string;
  status?: string;
}

interface DocumentListProps {
  documents: UploadedDoc[];
}

function getDocumentLabel(documentType: string): string {
  const config = DOCUMENT_TYPES[documentType];
  return config?.labelDe ?? documentType;
}

function getStatusBadgeVariant(status?: string) {
  switch (status) {
    case "analyzed":
      return "success" as const;
    case "analyzing":
      return "info" as const;
    case "error":
      return "critical" as const;
    default:
      return "neutral" as const;
  }
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case "uploaded":
      return "Hochgeladen";
    case "analyzing":
      return "Wird analysiert";
    case "analyzed":
      return "Analysiert";
    case "error":
      return "Fehler";
    default:
      return "Bereit";
  }
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-ec-grey-80">
        Hochgeladene Dokumente ({documents.length})
      </h3>
      <ul className="divide-y divide-ec-grey-40 rounded-lg border border-ec-grey-40">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <svg
                className="h-5 w-5 flex-shrink-0 text-ec-grey-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span className="truncate text-sm text-ec-grey-80">
                {doc.fileName}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {doc.documentType !== "unknown" && (
                <Badge variant="info">
                  {getDocumentLabel(doc.documentType)}
                </Badge>
              )}
              <Badge variant={getStatusBadgeVariant(doc.status)}>
                {getStatusLabel(doc.status)}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

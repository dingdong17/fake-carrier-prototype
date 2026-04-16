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
  analyzingDocId?: string | null;
}

function getDocumentLabel(documentType: string): string {
  const config = DOCUMENT_TYPES[documentType];
  return config?.labelDe ?? documentType;
}

export function DocumentList({ documents, analyzingDocId }: DocumentListProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-ec-grey-80">
        Hochgeladene Dokumente ({documents.length})
      </h3>
      <ul className="divide-y divide-ec-grey-40 rounded-lg border border-ec-grey-40">
        {documents.map((doc) => {
          const isAnalyzing = doc.id === analyzingDocId;
          const isAnalyzed = doc.status === "analyzed";
          const isUnknown = doc.documentType === "unknown";

          return (
            <li
              key={doc.id}
              className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                isAnalyzing ? "bg-ec-info/5" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Icon: spinner when analyzing, checkmark when done, doc icon otherwise */}
                {isAnalyzing ? (
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ec-dark-blue border-t-transparent" />
                  </span>
                ) : isAnalyzed ? (
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-ec-success">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
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
                )}
                <span className={`truncate text-sm ${isAnalyzing ? "font-medium text-ec-dark-blue" : "text-ec-grey-80"}`}>
                  {doc.fileName}
                </span>
                {isAnalyzing && (
                  <span className="text-xs text-ec-info">wird analysiert...</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isUnknown && (
                  <Badge variant={isAnalyzed ? "success" : "info"}>
                    {getDocumentLabel(doc.documentType)}
                  </Badge>
                )}
                {isAnalyzing && (
                  <Badge variant="info">Analyse</Badge>
                )}
                {!isAnalyzing && isUnknown && doc.status !== "analyzed" && (
                  <Badge variant="neutral">Bereit</Badge>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

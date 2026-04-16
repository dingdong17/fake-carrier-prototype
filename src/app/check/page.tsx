"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/check/progress-bar";
import { FileDropzone } from "@/components/check/file-dropzone";
import { CarrierForm } from "@/components/check/carrier-form";
import type { CarrierFormData } from "@/components/check/carrier-form";
import { DocumentList } from "@/components/check/document-list";
import type { UploadedDoc } from "@/components/check/document-list";
import { ExtractionPreview } from "@/components/check/extraction-preview";
import { AnalysisStream } from "@/components/check/analysis-stream";
import type { AnalysisEvent } from "@/components/check/analysis-stream";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

interface PendingExtraction {
  documentId: string;
  documentType: string;
  documentTypeLabelDe: string;
  extractedData: Record<string, unknown>;
}

const INITIAL_FORM: CarrierFormData = {
  carrierName: "",
  carrierCountry: "",
  carrierVatId: "",
  insurer: "",
  policyNumber: "",
  coverageStart: "",
  coverageEnd: "",
  sumInsured: "",
  coInsured: "",
};

export default function CheckPage() {
  const router = useRouter();

  // Flow steps:
  // 1 = initial (show dropzone)
  // 2 = AI is classifying/extracting uploaded documents
  // 3 = extraction results shown, user reviews form data
  // 4 = full analysis running (risk scoring, cross-check)
  // 5 = analysis complete, redirecting to results
  const [step, setStep] = useState(1);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CarrierFormData>(INITIAL_FORM);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisEvents, setAnalysisEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingExtractions, setPendingExtractions] = useState<PendingExtraction[]>([]);
  const [classificationLog, setClassificationLog] = useState<string[]>([]);

  const handleFormChange = useCallback(
    (field: keyof CarrierFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setError(null);
      setIsUploading(true);

      try {
        // Step 1: Upload files
        const formDataUpload = new FormData();
        for (const file of files) {
          formDataUpload.append("files", file);
        }
        if (checkId) {
          formDataUpload.append("checkId", checkId);
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload fehlgeschlagen");
        }

        const data = await res.json();
        setCheckId(data.checkId);
        const newDocs = data.documents as UploadedDoc[];
        setUploadedDocs((prev) => [...prev, ...newDocs]);
        setIsUploading(false);

        // Step 2: Immediately start AI classification & extraction
        setStep(2);
        const log: string[] = [];
        const extractions: PendingExtraction[] = [];

        for (const doc of newDocs) {
          log.push(`Analysiere "${doc.fileName}"...`);
          setClassificationLog([...log]);

          try {
            const classifyRes = await fetch("/api/classify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentId: doc.id }),
            });

            if (classifyRes.ok) {
              const classifyData = await classifyRes.json();
              const typeConfig = DOCUMENT_TYPES[classifyData.documentType];
              const typeName = typeConfig?.labelDe || classifyData.documentType;

              // Update doc in list
              setUploadedDocs((prev) =>
                prev.map((d) =>
                  d.id === doc.id
                    ? {
                        ...d,
                        documentType: classifyData.documentType,
                        status: classifyData.extractedData ? "analyzed" : "uploaded",
                      }
                    : d
                )
              );

              if (classifyData.documentType !== "unknown") {
                log.push(`"${doc.fileName}" erkannt als: ${typeName}`);
              } else {
                log.push(`"${doc.fileName}": Dokumenttyp konnte nicht bestimmt werden`);
              }
              setClassificationLog([...log]);

              // Collect extractions for review
              if (classifyData.extractedData) {
                log.push(`Daten aus ${typeName} extrahiert`);
                setClassificationLog([...log]);
                extractions.push({
                  documentId: doc.id,
                  documentType: classifyData.documentType,
                  documentTypeLabelDe: typeName,
                  extractedData: classifyData.extractedData,
                });
              }
            } else {
              log.push(`"${doc.fileName}": Klassifizierung fehlgeschlagen`);
              setClassificationLog([...log]);
            }
          } catch {
            log.push(`"${doc.fileName}": Fehler bei der Analyse`);
            setClassificationLog([...log]);
          }
        }

        // Step 3: Show extraction results for user review
        setPendingExtractions(extractions);
        setStep(3);
      } catch (err) {
        setIsUploading(false);
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      }
    },
    [checkId]
  );

  const handleAcceptExtraction = useCallback(
    (prefill: Partial<CarrierFormData>) => {
      setFormData((prev) => {
        const updated = { ...prev };
        for (const [key, value] of Object.entries(prefill)) {
          if (value && !prev[key as keyof CarrierFormData]) {
            updated[key as keyof CarrierFormData] = value;
          }
        }
        return updated;
      });
      // Remove the accepted extraction from pending
      setPendingExtractions((prev) => prev.slice(1));
    },
    []
  );

  const handleDismissExtraction = useCallback(() => {
    setPendingExtractions((prev) => prev.slice(1));
  }, []);

  const handleStartFullAnalysis = useCallback(async () => {
    if (!checkId) {
      setError("Kein Check vorhanden.");
      return;
    }

    // Update carrier info on the check before full analysis
    if (formData.carrierName) {
      const updateForm = new FormData();
      updateForm.append("checkId", checkId);
      updateForm.append("carrierName", formData.carrierName);
      if (formData.carrierCountry) updateForm.append("carrierCountry", formData.carrierCountry);
      if (formData.carrierVatId) updateForm.append("carrierVatId", formData.carrierVatId);
      updateForm.append("files", new Blob([]), "");
      await fetch("/api/upload", { method: "POST", body: updateForm }).catch(() => {});
    }

    setError(null);
    setStep(4);
    setIsAnalyzing(true);
    setAnalysisEvents([]);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analyse fehlgeschlagen");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Kein Stream verfügbar");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as AnalysisEvent;
              setAnalysisEvents((prev) => [...prev, data]);

              if (data.type === "completed") {
                setStep(5);
                setIsAnalyzing(false);
                setTimeout(() => router.push(`/results/${checkId}`), 1500);
              }

              if (data.type === "error") {
                setIsAnalyzing(false);
                setError(data.message || "Analyse fehlgeschlagen");
              }
            } catch {
              // Skip malformed SSE
            }
          }
        }
      }

      setIsAnalyzing(false);
    } catch (err) {
      setIsAnalyzing(false);
      setError(err instanceof Error ? err.message : "Analyse fehlgeschlagen");
    }
  }, [formData, checkId, router]);

  const handleUploadMore = useCallback(() => {
    setStep(1);
    setClassificationLog([]);
    setPendingExtractions([]);
  }, []);

  // Map step to progress bar step (progress bar has 4 steps)
  const progressStep = step <= 2 ? 1 : step === 3 ? 2 : step === 4 ? 2 : step === 5 ? 3 : 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">
        Frachtführer-Check
      </h1>

      <ProgressBar currentStep={progressStep} />

      {error && (
        <div className="rounded-lg border border-ec-error/20 bg-ec-error/5 px-4 py-3 text-sm text-ec-error">
          {error}
        </div>
      )}

      {/* Step 1: Upload documents */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-ec-dark-blue">
                Dokumente hochladen
              </h2>
              <p className="mt-1 text-sm text-ec-grey-70">
                Laden Sie die Dokumente des Frachtführers hoch. Die KI erkennt automatisch den Dokumenttyp und extrahiert relevante Daten.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FileDropzone
                  onFilesSelected={handleFilesSelected}
                  disabled={isUploading}
                />
                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-ec-info">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ec-info border-t-transparent" />
                    Dateien werden hochgeladen...
                  </div>
                )}
                {uploadedDocs.length > 0 && <DocumentList documents={uploadedDocs} />}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: AI is classifying — user waits */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-ec-dark-blue">
              KI-Analyse läuft
            </h2>
            <p className="mt-1 text-sm text-ec-grey-70">
              Die hochgeladenen Dokumente werden analysiert. Bitte warten...
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {classificationLog.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {i === classificationLog.length - 1 && (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ec-dark-blue border-t-transparent" />
                  )}
                  {i < classificationLog.length - 1 && (
                    <span className="text-ec-success">✓</span>
                  )}
                  <span className="text-ec-grey-80">{msg}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Extraction results — user reviews and edits */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Classification summary */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-ec-dark-blue">
                Analyse abgeschlossen
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {classificationLog.map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-ec-success">✓</span>
                    <span className="text-ec-grey-80">{msg}</span>
                  </div>
                ))}
              </div>
              <DocumentList documents={uploadedDocs} />
            </CardContent>
          </Card>

          {/* Pending extractions to review */}
          {pendingExtractions.length > 0 && (
            <ExtractionPreview
              documentType={pendingExtractions[0].documentType}
              documentTypeLabelDe={pendingExtractions[0].documentTypeLabelDe}
              extractedData={pendingExtractions[0].extractedData}
              onAccept={handleAcceptExtraction}
              onDismiss={handleDismissExtraction}
            />
          )}

          {/* Carrier form for review/edit */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-ec-dark-blue">
                Daten prüfen und ergänzen
              </h2>
              <p className="mt-1 text-sm text-ec-grey-70">
                Prüfen Sie die extrahierten Daten und ergänzen oder korrigieren Sie diese bei Bedarf.
              </p>
            </CardHeader>
            <CardContent>
              <CarrierForm
                data={formData}
                onChange={handleFormChange}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleUploadMore}>
              Weitere Dokumente hochladen
            </Button>
            <Button onClick={handleStartFullAnalysis} size="lg">
              Vollständige Analyse starten
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Full analysis running */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-ec-dark-blue">
              Vollständige Analyse läuft
            </h2>
            <p className="mt-1 text-sm text-ec-grey-70">
              Risikobewertung und dokumentübergreifende Prüfung werden durchgeführt...
            </p>
          </CardHeader>
          <CardContent>
            <AnalysisStream events={analysisEvents} isAnalyzing={isAnalyzing} />
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete — redirecting */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-ec-dark-blue">
              Analyse abgeschlossen
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AnalysisStream events={analysisEvents} isAnalyzing={false} />
              <p className="text-sm font-medium text-ec-success">
                ✓ Weiterleitung zum Ergebnis...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

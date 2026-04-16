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

  const [step, setStep] = useState(1);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CarrierFormData>(INITIAL_FORM);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisEvents, setAnalysisEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingExtraction, setPendingExtraction] = useState<PendingExtraction | null>(null);

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
        const formDataUpload = new FormData();
        for (const file of files) {
          formDataUpload.append("files", file);
        }
        if (checkId) {
          formDataUpload.append("checkId", checkId);
        }
        if (formData.carrierName) {
          formDataUpload.append("carrierName", formData.carrierName);
        }
        if (formData.carrierCountry) {
          formDataUpload.append("carrierCountry", formData.carrierCountry);
        }
        if (formData.carrierVatId) {
          formDataUpload.append("carrierVatId", formData.carrierVatId);
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
        setUploadedDocs((prev) => [...prev, ...data.documents]);

        // Auto-classify each uploaded document
        setIsUploading(false);
        setIsClassifying(true);

        for (const doc of data.documents) {
          try {
            const classifyRes = await fetch("/api/classify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentId: doc.id }),
            });

            if (classifyRes.ok) {
              const classifyData = await classifyRes.json();

              // Update document type in the list
              setUploadedDocs((prev) =>
                prev.map((d) =>
                  d.id === doc.id
                    ? { ...d, documentType: classifyData.documentType, status: classifyData.extractedData ? "analyzed" : "uploaded" }
                    : d
                )
              );

              // If we got extracted data (insurance cert), show the preview
              if (classifyData.extractedData && classifyData.documentType === "insurance-cert") {
                const typeConfig = DOCUMENT_TYPES[classifyData.documentType];
                setPendingExtraction({
                  documentId: doc.id,
                  documentType: classifyData.documentType,
                  documentTypeLabelDe: typeConfig?.labelDe || classifyData.documentType,
                  extractedData: classifyData.extractedData,
                });
              }
            }
          } catch {
            // Classification failed silently — document stays as "unknown"
          }
        }

        setIsClassifying(false);
      } catch (err) {
        setIsUploading(false);
        setIsClassifying(false);
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      }
    },
    [checkId, formData]
  );

  const handleAcceptExtraction = useCallback(
    (prefill: Partial<CarrierFormData>) => {
      setFormData((prev) => {
        const updated = { ...prev };
        for (const [key, value] of Object.entries(prefill)) {
          if (value && !prev[key as keyof CarrierFormData]) {
            // Only fill empty fields
            updated[key as keyof CarrierFormData] = value;
          }
        }
        return updated;
      });
      setPendingExtraction(null);
    },
    []
  );

  const handleDismissExtraction = useCallback(() => {
    setPendingExtraction(null);
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!formData.carrierName.trim()) {
      setError("Bitte geben Sie einen Firmennamen ein.");
      return;
    }
    if (uploadedDocs.length === 0) {
      setError("Bitte laden Sie mindestens ein Dokument hoch.");
      return;
    }
    if (!checkId) {
      setError("Kein Check vorhanden. Bitte laden Sie zuerst Dokumente hoch.");
      return;
    }

    // Update carrier info before analysis
    const updateForm = new FormData();
    updateForm.append("checkId", checkId);
    updateForm.append("carrierName", formData.carrierName);
    if (formData.carrierCountry) updateForm.append("carrierCountry", formData.carrierCountry);
    if (formData.carrierVatId) updateForm.append("carrierVatId", formData.carrierVatId);
    // Send a dummy empty file to trigger the update-only path
    updateForm.append("files", new Blob([]), "");
    await fetch("/api/upload", { method: "POST", body: updateForm }).catch(() => {});

    setError(null);
    setStep(2);
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
      if (!reader) {
        throw new Error("Kein Stream verfügbar");
      }

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
                setStep(3);
                setIsAnalyzing(false);
                setTimeout(() => {
                  router.push(`/results/${checkId}`);
                }, 1500);
              }

              if (data.type === "error") {
                setIsAnalyzing(false);
                setError(data.message || "Analyse fehlgeschlagen");
              }
            } catch {
              // Skip malformed SSE events
            }
          }
        }
      }

      setIsAnalyzing(false);
    } catch (err) {
      setIsAnalyzing(false);
      setError(err instanceof Error ? err.message : "Analyse fehlgeschlagen");
    }
  }, [formData, uploadedDocs, checkId, router]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">
        Frachtführer-Check
      </h1>

      <ProgressBar currentStep={step} />

      {error && (
        <div className="rounded-lg border border-ec-error/20 bg-ec-error/5 px-4 py-3 text-sm text-ec-error">
          {error}
        </div>
      )}

      {/* Step 1: Upload & Carrier Info */}
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
                  disabled={isUploading || isClassifying}
                />
                {isUploading && (
                  <p className="text-sm text-ec-grey-70">
                    Dateien werden hochgeladen...
                  </p>
                )}
                {isClassifying && (
                  <div className="flex items-center gap-2 text-sm text-ec-info">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ec-info border-t-transparent" />
                    Dokument wird von der KI analysiert...
                  </div>
                )}
                <DocumentList documents={uploadedDocs} />
              </div>
            </CardContent>
          </Card>

          {/* Extraction preview — shown when AI extracted data from a document */}
          {pendingExtraction && (
            <ExtractionPreview
              documentType={pendingExtraction.documentType}
              documentTypeLabelDe={pendingExtraction.documentTypeLabelDe}
              extractedData={pendingExtraction.extractedData}
              onAccept={handleAcceptExtraction}
              onDismiss={handleDismissExtraction}
            />
          )}

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-ec-dark-blue">
                Frachtführer-Informationen
              </h2>
              <p className="mt-1 text-sm text-ec-grey-70">
                Felder können manuell ausgefüllt oder automatisch aus den Dokumenten übernommen werden.
              </p>
            </CardHeader>
            <CardContent>
              <CarrierForm
                data={formData}
                onChange={handleFormChange}
                disabled={isUploading || isClassifying}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleStartAnalysis}
              disabled={isUploading || isClassifying || uploadedDocs.length === 0}
              size="lg"
            >
              Analyse starten
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Analysis Running */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-ec-dark-blue">
              Analyse läuft
            </h2>
          </CardHeader>
          <CardContent>
            <AnalysisStream events={analysisEvents} isAnalyzing={isAnalyzing} />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Completed — redirecting */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-ec-dark-blue">
              Analyse abgeschlossen
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AnalysisStream events={analysisEvents} isAnalyzing={false} />
              <p className="text-sm text-ec-grey-70">
                Weiterleitung zum Ergebnis...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

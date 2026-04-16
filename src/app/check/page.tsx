"use client";

import { useState, useCallback, useMemo } from "react";
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
import { DocumentChecklist } from "@/components/check/document-checklist";
import type { ChecklistItem } from "@/components/check/document-checklist";
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
  // 1 = upload documents (user stays here, uploads multiple docs, sees checklist fill up)
  // 2 = review extracted data & carrier form
  // 3 = full analysis running (risk scoring, cross-check)
  // 4 = analysis complete, redirecting to results
  const [step, setStep] = useState(1);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CarrierFormData>(INITIAL_FORM);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisEvents, setAnalysisEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingExtractions, setPendingExtractions] = useState<PendingExtraction[]>([]);
  const [classificationLog, setClassificationLog] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "insurance-cert", labelDe: "Versicherungsnachweis vorhanden", checked: false, autoDetected: false },
    { id: "is-verkehrshaftung", labelDe: "Verkehrshaftungsversicherung bestätigt", checked: false, autoDetected: false },
    { id: "vat-valid", labelDe: "USt-IdNr. geprüft (VIES)", checked: false, autoDetected: false },
    { id: "website-exists", labelDe: "Webseite des Unternehmens erreichbar", checked: false, autoDetected: false },
    { id: "transport-license", labelDe: "EU-Transportlizenz vorhanden", checked: false, autoDetected: false },
    { id: "letterhead", labelDe: "Briefkopf / Unternehmensdaten vorhanden", checked: false, autoDetected: false },
    { id: "freight-profile", labelDe: "Frachtenbörsen-Profil vorhanden", checked: false, autoDetected: false },
    { id: "communication", labelDe: "Kommunikation / E-Mails vorhanden", checked: false, autoDetected: false },
    { id: "driver-vehicle", labelDe: "Fahrer- & Fahrzeugdaten vorhanden", checked: false, autoDetected: false },
  ]);

  const allChecked = useMemo(() => checklist.every((item) => item.checked), [checklist]);
  const hasAnyDoc = uploadedDocs.length > 0;

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

        // Classify each document inline (stay on step 1)
        setIsClassifying(true);

        for (const doc of newDocs) {
          setClassificationLog((prev) => [...prev, `Analysiere "${doc.fileName}"...`]);

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
                setClassificationLog((prev) => [...prev, `"${doc.fileName}" erkannt als: ${typeName}`]);

                // Tick the checklist
                setChecklist((prev) =>
                  prev.map((item) =>
                    item.id === classifyData.documentType
                      ? { ...item, checked: true, autoDetected: true, details: doc.fileName }
                      : item
                  )
                );
              } else {
                setClassificationLog((prev) => [...prev, `"${doc.fileName}": Dokumenttyp konnte nicht bestimmt werden`]);
              }

              // Handle extractions
              if (classifyData.extractedData) {
                setClassificationLog((prev) => [...prev, `Daten aus ${typeName} extrahiert`]);

                // Check Verkehrshaftung
                if (classifyData.extractedData.isVerkehrshaftung === true) {
                  setClassificationLog((prev) => [...prev, `Verkehrshaftungsversicherung bestätigt`]);
                  setChecklist((prev) =>
                    prev.map((item) =>
                      item.id === "is-verkehrshaftung"
                        ? { ...item, checked: true, autoDetected: true, details: classifyData.extractedData.coverageType || "Erkannt aus Dokumentinhalt" }
                        : item
                    )
                  );
                }

                setPendingExtractions((prev) => [
                  ...prev,
                  {
                    documentId: doc.id,
                    documentType: classifyData.documentType,
                    documentTypeLabelDe: typeName,
                    extractedData: classifyData.extractedData,
                  },
                ]);

                // Auto-verify: VAT + Website check
                const companyName = classifyData.extractedData.insuredCompany as string | undefined;
                const vatId = classifyData.extractedData.vatId as string | undefined;

                if (companyName || vatId) {
                  setClassificationLog((prev) => [...prev, "Unternehmensprüfung wird durchgeführt..."]);

                  try {
                    const verifyRes = await fetch("/api/verify", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        companyName: companyName || "",
                        vatId: vatId || "",
                        country: "",
                      }),
                    });

                    if (verifyRes.ok) {
                      const verifyData = await verifyRes.json();

                      if (verifyData.vatValidation) {
                        const vat = verifyData.vatValidation;
                        if (vat.valid) {
                          setClassificationLog((prev) => [
                            ...prev,
                            `USt-IdNr. ${vatId} ist gültig` + (vat.registeredName ? ` (${vat.registeredName})` : ""),
                          ]);
                          setChecklist((prev) =>
                            prev.map((item) =>
                              item.id === "vat-valid"
                                ? { ...item, checked: true, autoDetected: true, details: vat.registeredName || `${vatId} gültig` }
                                : item
                            )
                          );
                        } else {
                          setClassificationLog((prev) => [
                            ...prev,
                            `USt-IdNr. ${vatId}: ${vat.error || "Nicht gültig oder nicht gefunden"}`,
                          ]);
                        }
                      }

                      if (verifyData.websiteCheck) {
                        const web = verifyData.websiteCheck;
                        if (web.exists) {
                          setClassificationLog((prev) => [
                            ...prev,
                            `Webseite gefunden: ${web.url}`,
                          ]);
                          setChecklist((prev) =>
                            prev.map((item) =>
                              item.id === "website-exists"
                                ? { ...item, checked: true, autoDetected: true, details: web.url }
                                : item
                            )
                          );
                        } else {
                          setClassificationLog((prev) => [
                            ...prev,
                            `Keine Webseite gefunden für "${companyName}"`,
                          ]);
                        }
                      }
                    }
                  } catch {
                    setClassificationLog((prev) => [...prev, "Unternehmensprüfung fehlgeschlagen"]);
                  }
                }
              }
            } else {
              setClassificationLog((prev) => [...prev, `"${doc.fileName}": Klassifizierung fehlgeschlagen`]);
            }
          } catch {
            setClassificationLog((prev) => [...prev, `"${doc.fileName}": Fehler bei der Analyse`]);
          }
        }

        setIsClassifying(false);
      } catch (err) {
        setIsUploading(false);
        setIsClassifying(false);
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
      setPendingExtractions((prev) => prev.slice(1));
    },
    []
  );

  const handleDismissExtraction = useCallback(() => {
    setPendingExtractions((prev) => prev.slice(1));
  }, []);

  const handleProceedToReview = useCallback(() => {
    setStep(2);
  }, []);

  const handleBackToUpload = useCallback(() => {
    setStep(1);
  }, []);

  const handleStartFullAnalysis = useCallback(async () => {
    if (!checkId) {
      setError("Kein Check vorhanden.");
      return;
    }

    // Update carrier info before analysis
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
    setStep(3);
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
                setStep(4);
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

  // Map step to progress bar (4 progress bar steps)
  const progressStep = step === 1 ? 1 : step === 2 ? 2 : step === 3 ? 3 : step === 4 ? 4 : 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">
        Frachtführer-Check
      </h1>

      <ProgressBar currentStep={progressStep} />

      {error && (
        <div className="rounded-lg border border-ec-error/20 bg-ec-error/5 px-4 py-3 text-sm text-ec-error">
          {error}
        </div>
      )}

      {/* Step 1: Upload documents — user stays here until they decide to proceed */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-ec-dark-blue">
                    Dokumente hochladen
                  </h2>
                  <p className="mt-1 text-sm text-ec-grey-70">
                    Laden Sie die Dokumente des Frachtführers hoch. Die KI erkennt automatisch den Dokumenttyp und extrahiert relevante Daten. Sie können mehrfach Dokumente hochladen.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <FileDropzone
                      onFilesSelected={handleFilesSelected}
                      disabled={isUploading || isClassifying}
                    />
                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-ec-info">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ec-info border-t-transparent" />
                        Dateien werden hochgeladen...
                      </div>
                    )}
                    {isClassifying && (
                      <div className="flex items-center gap-2 text-sm text-ec-dark-blue">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ec-dark-blue border-t-transparent" />
                        KI analysiert Dokument...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Classification log */}
              {classificationLog.length > 0 && (
                <Card>
                  <CardContent>
                    <div className="space-y-2">
                      {classificationLog.map((msg, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-ec-success">✓</span>
                          <span className="text-ec-grey-80">{msg}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Document list */}
              {uploadedDocs.length > 0 && (
                <Card>
                  <CardContent>
                    <DocumentList documents={uploadedDocs} />
                  </CardContent>
                </Card>
              )}

              {/* Pending extractions — shown inline on step 1 */}
              {pendingExtractions.length > 0 && (
                <ExtractionPreview
                  documentType={pendingExtractions[0].documentType}
                  documentTypeLabelDe={pendingExtractions[0].documentTypeLabelDe}
                  extractedData={pendingExtractions[0].extractedData}
                  onAccept={handleAcceptExtraction}
                  onDismiss={handleDismissExtraction}
                />
              )}
            </div>

            {/* Checklist sidebar */}
            <div className="space-y-4">
              <Card className="h-fit">
                <DocumentChecklist items={checklist} />
              </Card>

              {/* All checks green — congratulate and encourage to proceed */}
              {allChecked && (
                <Card className="border-ec-success/30 bg-ec-success/5">
                  <div className="space-y-3 text-center">
                    <div className="text-3xl">🎉</div>
                    <p className="text-sm font-semibold text-ec-success">
                      Hervorragend! Alle Dokumente liegen vor.
                    </p>
                    <p className="text-xs text-ec-grey-70">
                      Sie haben eine optimale Grundlage für die Analyse geschaffen. Fahren Sie jetzt mit der Datenprüfung fort.
                    </p>
                    <Button onClick={handleProceedToReview} size="lg" className="w-full">
                      Weiter zur Datenprüfung
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Proceed button — always available once at least one doc is uploaded */}
          {hasAnyDoc && !isClassifying && !allChecked && (
            <div className="flex justify-end">
              <Button onClick={handleProceedToReview} variant={allChecked ? "primary" : "outline"}>
                Weiter zur Datenprüfung
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review extracted data & carrier form */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
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
            <Card className="h-fit">
              <DocumentChecklist items={checklist} />
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBackToUpload}>
              Zurück — weitere Dokumente hochladen
            </Button>
            <Button onClick={handleStartFullAnalysis} size="lg">
              Vollständige Analyse starten
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Full analysis running */}
      {step === 3 && (
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

      {/* Step 4: Complete — redirecting */}
      {step === 4 && (
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

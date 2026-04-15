"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/check/progress-bar";
import { FileDropzone } from "@/components/check/file-dropzone";
import { CarrierForm } from "@/components/check/carrier-form";
import { DocumentList } from "@/components/check/document-list";
import type { UploadedDoc } from "@/components/check/document-list";
import { AnalysisStream } from "@/components/check/analysis-stream";
import type { AnalysisEvent } from "@/components/check/analysis-stream";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function CheckPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState("");
  const [carrierCountry, setCarrierCountry] = useState("");
  const [carrierVatId, setCarrierVatId] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisEvents, setAnalysisEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleCarrierChange = useCallback(
    (field: "carrierName" | "carrierCountry" | "carrierVatId", value: string) => {
      switch (field) {
        case "carrierName":
          setCarrierName(value);
          break;
        case "carrierCountry":
          setCarrierCountry(value);
          break;
        case "carrierVatId":
          setCarrierVatId(value);
          break;
      }
    },
    []
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }
        if (checkId) {
          formData.append("checkId", checkId);
        }
        if (carrierName) {
          formData.append("carrierName", carrierName);
        }
        if (carrierCountry) {
          formData.append("carrierCountry", carrierCountry);
        }
        if (carrierVatId) {
          formData.append("carrierVatId", carrierVatId);
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload fehlgeschlagen");
        }

        const data = await res.json();
        setCheckId(data.checkId);
        setUploadedDocs((prev) => [...prev, ...data.documents]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      } finally {
        setIsUploading(false);
      }
    },
    [checkId, carrierName, carrierCountry, carrierVatId]
  );

  const handleStartAnalysis = useCallback(async () => {
    if (!carrierName.trim()) {
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
              const data = JSON.parse(line.slice(6)) as AnalysisEvent & {
                riskScore?: number;
                confidenceLevel?: number;
                recommendation?: string;
              };

              setAnalysisEvents((prev) => [...prev, data]);

              if (data.type === "completed") {
                setStep(3);
                setIsAnalyzing(false);
                // Redirect to results after a short delay
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
  }, [carrierName, uploadedDocs, checkId, router]);

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
                Frachtführer-Informationen
              </h2>
            </CardHeader>
            <CardContent>
              <CarrierForm
                carrierName={carrierName}
                carrierCountry={carrierCountry}
                carrierVatId={carrierVatId}
                onChange={handleCarrierChange}
                disabled={isUploading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-ec-dark-blue">
                Dokumente hochladen
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FileDropzone
                  onFilesSelected={handleFilesSelected}
                  disabled={isUploading}
                />
                {isUploading && (
                  <p className="text-sm text-ec-grey-70">
                    Dateien werden hochgeladen...
                  </p>
                )}
                <DocumentList documents={uploadedDocs} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleStartAnalysis}
              disabled={isUploading || uploadedDocs.length === 0}
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
              <AnalysisStream
                events={analysisEvents}
                isAnalyzing={false}
              />
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

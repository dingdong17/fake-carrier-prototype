"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBlockNavigation } from "@/lib/navigation-blocker";
import { ProgressBar } from "@/components/check/progress-bar";
import { FileDropzone } from "@/components/check/file-dropzone";
import { CarrierForm } from "@/components/check/carrier-form";
import type { CarrierFormData } from "@/components/check/carrier-form";
import { DocumentList } from "@/components/check/document-list";
import type { UploadedDoc } from "@/components/check/document-list";
import { AnalysisStream } from "@/components/check/analysis-stream";
import type { AnalysisEvent } from "@/components/check/analysis-stream";
import { DocumentChecklist } from "@/components/check/document-checklist";
import { AiTerminal } from "@/components/check/ai-terminal";
import type { ChecklistItem } from "@/components/check/document-checklist";
import { RiskQuestions } from "@/components/check/risk-questions";
import type { RiskAnswer } from "@/components/check/risk-questions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  getClassifyingMessage,
  getIdentifiedMessage,
  getExtractingMessages,
  getExtractedMessage,
} from "@/lib/terminal-messages";
import { sanitizeErrorMessage } from "@/lib/errors/sanitize";
import { TestSetPicker } from "@/components/check/test-set-picker";
import { DEFAULT_TIER } from "@/lib/catalog/tier";
import type { Tier } from "@/lib/catalog/checks";
import { extractCarrierPrefill } from "@/lib/extraction-prefill";

const CARRIER_FIELD_LABELS: Record<keyof CarrierFormData, string> = {
  carrierName: "Firmenname",
  carrierCountry: "Land",
  carrierVatId: "USt-IdNr.",
  carrierEmail: "E-Mail",
  carrierWebsite: "Webseite",
  insurer: "Versicherer",
  policyNumber: "Policennummer",
  coverageStart: "Deckung von",
  coverageEnd: "Deckung bis",
  sumInsured: "Versicherungssumme",
  coInsured: "Mitversicherte Unternehmen",
};

const INITIAL_FORM: CarrierFormData = {
  carrierName: "",
  carrierCountry: "",
  carrierVatId: "",
  carrierEmail: "",
  carrierWebsite: "",
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
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [analyzingDocName, setAnalyzingDocName] = useState<string | null>(null);
  const [riskAnswers, setRiskAnswers] = useState<RiskAnswer[]>([]);
  const [classificationLog, setClassificationLog] = useState<string[]>([]);
  const [testSet, setTestSet] = useState<Tier>(DEFAULT_TIER);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "insurance-cert", labelDe: "Versicherungsnachweis", checked: false, autoDetected: false },
    { id: "is-verkehrshaftung", labelDe: "Verkehrshaftung bestätigt", checked: false, autoDetected: false },
    { id: "vat-valid", labelDe: "USt-IdNr. geprüft", checked: false, autoDetected: false },
    { id: "website-exists", labelDe: "Webseite erreichbar", checked: false, autoDetected: false },
    { id: "domain-age", labelDe: "Domain-Alter geprüft", checked: false, autoDetected: false },
    { id: "email-verified", labelDe: "E-Mail verifiziert", checked: false, autoDetected: false },
    { id: "transport-license", labelDe: "EU-Transportlizenz", checked: false, autoDetected: false },
    { id: "letterhead", labelDe: "Briefkopf / Firmendaten", checked: false, autoDetected: false },
    { id: "freight-profile", labelDe: "Frachtenbörsen-Profil", checked: false, autoDetected: false },
    { id: "communication", labelDe: "Kommunikation", checked: false, autoDetected: false },
    { id: "driver-vehicle", labelDe: "Fahrer- & Fahrzeugdaten", checked: false, autoDetected: false },
  ]);

  const hasAnyDoc = uploadedDocs.length > 0;

  const isBusy = isUploading || isClassifying || isAnalyzing;

  const blockReason = useMemo(() => {
    if (isAnalyzing) {
      return "Die vollständige Analyse läuft. Wenn Sie die Seite jetzt verlassen, werden bereits erhobene Zwischenergebnisse verworfen.";
    }
    if (isClassifying) {
      return "Ein Dokument wird gerade klassifiziert. Wenn Sie die Seite jetzt verlassen, geht der Fortschritt verloren.";
    }
    if (isUploading) {
      return "Dokumente werden gerade hochgeladen. Wenn Sie die Seite jetzt verlassen, wird der Upload abgebrochen.";
    }
    return "";
  }, [isUploading, isClassifying, isAnalyzing]);

  const handleDiscardCheck = useCallback(async () => {
    if (!checkId) return;
    try {
      await fetch(`/api/check/${checkId}/discard`, { method: "DELETE" });
    } catch (err) {
      console.error("Discard failed", err);
    }
  }, [checkId]);

  useBlockNavigation({
    isActive: isBusy,
    reason: blockReason,
    onDiscard: checkId ? handleDiscardCheck : undefined,
  });

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
        formDataUpload.append("testSet", testSet);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(sanitizeErrorMessage(data.error).message);
        }

        const data = await res.json();
        setCheckId(data.checkId);
        const newDocs = data.documents as UploadedDoc[];
        setUploadedDocs((prev) => [...prev, ...newDocs]);
        setIsUploading(false);

        // Classify each document inline (stay on step 1)
        setIsClassifying(true);

        for (const doc of newDocs) {
          // Track which doc is being analyzed
          setAnalyzingDocId(doc.id);
          setAnalyzingDocName(doc.fileName);

          // Phase 1: Upload acknowledged
          setClassificationLog((prev) => [...prev, `Dokument empfangen: "${doc.fileName}"`]);

          // Phase 2: Classification
          setClassificationLog((prev) => [...prev, getClassifyingMessage()]);

          try {
            const classifyRes = await fetch("/api/classify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentId: doc.id }),
            });

            if (classifyRes.ok) {
              const classifyData = await classifyRes.json();
              const docType = classifyData.documentType as string;

              // Show timing analytics
              if (classifyData.timing) {
                const t = classifyData.timing;
                const parts = [`${t.fileSizeKB}KB`];
                parts.push(`Erkennung: ${(t.apiCallMs / 1000).toFixed(1)}s`);
                if (t.extractMs > 0) {
                  parts.push(`Extraktion: ${(t.extractMs / 1000).toFixed(1)}s`);
                }
                parts.push(`Gesamt: ${(t.totalRequestMs / 1000).toFixed(1)}s`);
                setClassificationLog((prev) => [...prev, parts.join(" | ")]);
              }

              // Update doc in list
              setUploadedDocs((prev) =>
                prev.map((d) =>
                  d.id === doc.id
                    ? {
                        ...d,
                        documentType: docType,
                        status: classifyData.extractedData ? "analyzed" : "uploaded",
                      }
                    : d
                )
              );

              // Phase 3: Identification result — document-type-specific message
              setClassificationLog((prev) => [...prev, getIdentifiedMessage(docType)]);

              if (docType !== "unknown") {
                // Tick the checklist
                setChecklist((prev) =>
                  prev.map((item) =>
                    item.id === docType
                      ? { ...item, checked: true, autoDetected: true, details: doc.fileName }
                      : item
                  )
                );
              }

              // Phase 4: Extraction — show document-type-specific extraction messages
              if (classifyData.extractedData) {
                const extractMsgs = getExtractingMessages(docType);
                // Show 2-3 fitting extraction messages
                const msgCount = Math.min(extractMsgs.length, 2 + Math.floor(Math.random() * 2));
                for (let i = 0; i < msgCount; i++) {
                  setClassificationLog((prev) => [...prev, extractMsgs[i]]);
                }
                setClassificationLog((prev) => [...prev, getExtractedMessage(docType)]);

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

                // Auto-apply extracted data into empty form fields — no user confirmation needed
                const prefill = extractCarrierPrefill(docType, classifyData.extractedData);
                if (Object.keys(prefill).length > 0) {
                  const applied: string[] = [];
                  setFormData((prev) => {
                    const updated = { ...prev };
                    for (const [k, v] of Object.entries(prefill)) {
                      const key = k as keyof CarrierFormData;
                      if (!prev[key] && v) {
                        updated[key] = v;
                        applied.push(CARRIER_FIELD_LABELS[key]);
                      }
                    }
                    return updated;
                  });
                  if (applied.length > 0) {
                    setClassificationLog((prev) => [
                      ...prev,
                      `Formularfelder automatisch befüllt: ${applied.join(", ")}`,
                    ]);
                  }
                }

                // Auto-verify: VAT + Website check
                const companyName = classifyData.extractedData.insuredCompany as string | undefined;
                const vatId = classifyData.extractedData.vatIdCarrier as string | undefined;
                const extractedEmail = (classifyData.extractedData.senderEmail || classifyData.extractedData.email || classifyData.extractedData.contactInfo?.email || "") as string;
                const extractedWebsite = (classifyData.extractedData.website || "") as string;

                if (companyName || vatId || extractedEmail) {
                  setClassificationLog((prev) => [...prev, "Unternehmensprüfung wird durchgeführt..."]);

                  try {
                    const verifyRes = await fetch("/api/verify", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        companyName: companyName || "",
                        vatId: vatId || "",
                        country: "",
                        email: extractedEmail || "",
                        website: extractedWebsite || "",
                      }),
                    });

                    if (verifyRes.ok) {
                      const verifyData = await verifyRes.json();

                      if (verifyData.vatValidation) {
                        const vat = verifyData.vatValidation;
                        if (vat.valid) {
                          let vatMsg = `USt-IdNr. ${vatId} ist gültig`;
                          if (vat.registeredName && vat.registeredName !== "---") {
                            vatMsg += ` — registriert auf: "${vat.registeredName}"`;
                            if (vat.nameMatchesDocument === true) {
                              vatMsg += " (stimmt mit Dokument überein)";
                            } else if (vat.nameMatchesDocument === false) {
                              vatMsg += " (ACHTUNG: Name weicht vom Dokument ab!)";
                            }
                          } else {
                            vatMsg += " (Land liefert keinen Firmennamen über VIES)";
                          }
                          setClassificationLog((prev) => [...prev, vatMsg]);

                          const checkDetails = vat.registeredName && vat.registeredName !== "---"
                            ? `${vatId} → ${vat.registeredName}`
                            : `${vatId} gültig`;
                          setChecklist((prev) =>
                            prev.map((item) =>
                              item.id === "vat-valid"
                                ? { ...item, checked: true, autoDetected: true, details: checkDetails }
                                : item
                            )
                          );

                          // Name mismatch = critical warning
                          if (vat.nameMatchesDocument === false) {
                            setClassificationLog((prev) => [
                              ...prev,
                              `WARNUNG: USt-IdNr. ${vatId} ist auf "${vat.registeredName}" registriert, nicht auf "${companyName}"`,
                            ]);
                          }
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

                      // Domain age check results
                      if (verifyData.domainCheck) {
                        const dom = verifyData.domainCheck;
                        if (dom.exists && dom.ageInDays !== null) {
                          const years = Math.floor(dom.ageInDays / 365);
                          const months = Math.floor((dom.ageInDays % 365) / 30);
                          const ageText = years > 0 ? `${years} Jahre, ${months} Monate` : `${months} Monate`;
                          if (dom.isYoung) {
                            setClassificationLog((prev) => [
                              ...prev,
                              `WARNUNG: Domain ${dom.domain} ist erst ${ageText} alt (< 6 Monate)`,
                            ]);
                          } else {
                            setClassificationLog((prev) => [
                              ...prev,
                              `Domain ${dom.domain} registriert seit ${ageText}${dom.registrar ? ` (${dom.registrar})` : ""}`,
                            ]);
                          }
                          setChecklist((prev) =>
                            prev.map((item) =>
                              item.id === "domain-age"
                                ? {
                                    ...item,
                                    checked: true,
                                    autoDetected: true,
                                    details: dom.isYoung ? `Nur ${ageText} — Warnung!` : `${ageText} alt`,
                                  }
                                : item
                            )
                          );
                        } else if (!dom.exists) {
                          setClassificationLog((prev) => [...prev, `Domain ${dom.domain} nicht gefunden`]);
                        }
                      }

                      // Email verification results
                      if (verifyData.emailCheck) {
                        const em = verifyData.emailCheck;
                        const msgs: string[] = [];
                        if (em.isFreemail) {
                          msgs.push(`Freemail erkannt: ${em.freemailProvider}`);
                        }
                        if (!em.domainExists) {
                          msgs.push(`E-Mail-Domain ${em.domain} existiert nicht!`);
                        }
                        if (em.domainMatchesCompany === false) {
                          msgs.push(`E-Mail-Domain "${em.domain}" passt nicht zum Firmennamen`);
                        } else if (em.domainMatchesCompany === true) {
                          msgs.push(`E-Mail-Domain passt zum Firmennamen`);
                        }
                        if (msgs.length > 0) {
                          setClassificationLog((prev) => [...prev, ...msgs]);
                        }
                        setChecklist((prev) =>
                          prev.map((item) =>
                            item.id === "email-verified"
                              ? {
                                  ...item,
                                  checked: true,
                                  autoDetected: true,
                                  details: em.isFreemail
                                    ? `Freemail: ${em.freemailProvider}`
                                    : em.domainMatchesCompany
                                      ? "Domain passt"
                                      : em.domain,
                                }
                              : item
                          )
                        );
                      }
                    }
                  } catch {
                    setClassificationLog((prev) => [...prev, "Unternehmensprüfung fehlgeschlagen"]);
                  }
                }

                // Auto-detect behavioral risk signals from extracted data
                const ed = classifyData.extractedData;

                // Freemail detection
                const email = (ed.senderEmail || ed.email || "") as string;
                if (email && /gmail|gmx|hotmail|outlook|yahoo|web\.de|freenet|t-online/i.test(email)) {
                  setRiskAnswers((prev) => {
                    if (prev.some((a) => a.questionId === "freemail-address")) return prev;
                    return [...prev, { questionId: "freemail-address", answer: "yes", autoDetected: true, detail: `Freemail erkannt: ${email}` }];
                  });
                  setClassificationLog((prev) => [...prev, `Freemail-Adresse erkannt: ${email}`]);
                }

                // Communication-only detection (if communication doc but no phone found)
                if (docType === "communication" && !ed.phone) {
                  setRiskAnswers((prev) => {
                    if (prev.some((a) => a.questionId === "email-only")) return prev;
                    return [...prev, { questionId: "email-only", answer: "yes", autoDetected: true, detail: "Nur E-Mail-Kommunikation im Dokument erkannt" }];
                  });
                }
              }
            } else {
              const errData = await classifyRes.json().catch(() => ({}));
              const safe = sanitizeErrorMessage(errData.error);
              setClassificationLog((prev) => [
                ...prev,
                `"${doc.fileName}": Klassifizierung fehlgeschlagen — ${safe.message}`,
              ]);
            }
          } catch (err) {
            const safe = sanitizeErrorMessage(
              err instanceof Error ? err.message : null
            );
            setClassificationLog((prev) => [
              ...prev,
              `"${doc.fileName}": Fehler bei der Analyse — ${safe.message}`,
            ]);
          }
        }

        setIsClassifying(false);
        setAnalyzingDocId(null);
        setAnalyzingDocName(null);
      } catch (err) {
        setIsUploading(false);
        setIsClassifying(false);
        setAnalyzingDocId(null);
        setAnalyzingDocName(null);
        const safe = sanitizeErrorMessage(
          err instanceof Error ? err.message : null
        );
        setError(safe.message);
      }
    },
    [checkId, testSet]
  );

  const handleRiskAnswer = useCallback((questionId: string, answer: "yes" | "no" | "unknown") => {
    setRiskAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId);
      if (existing) {
        return prev.map((a) => a.questionId === questionId ? { ...a, answer } : a);
      }
      return [...prev, { questionId, answer, autoDetected: false }];
    });
  }, []);

  const handleStartFullAnalysis = useCallback(async () => {
    if (!checkId) {
      setError("Kein Check vorhanden.");
      return;
    }

    // Save risk answers for the results page
    localStorage.setItem(`risk-answers-${checkId}`, JSON.stringify(riskAnswers));

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
        const data = await res.json().catch(() => ({}));
        throw new Error(sanitizeErrorMessage(data.error).message);
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
                setError(sanitizeErrorMessage(data.message).message);
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
      const safe = sanitizeErrorMessage(
        err instanceof Error ? err.message : null
      );
      setError(safe.message);
    }
  }, [formData, checkId, router]);

  // Internal step mirrors the 4-stage progress bar:
  // 1 = data entry, 2 = context questions, 3 = full analysis, 4 = complete/redirect
  const progressStep = step;

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

      {/* Merged step 1: data entry (manual form + document upload, combined) */}
      {step === 1 && (
        <div className="space-y-6">
          {/* German how-to-use help block */}
          <div className="rounded-xl border border-ec-info/30 bg-ec-info/5 p-4 text-sm text-ec-grey-80">
            <h2 className="mb-2 font-semibold text-ec-dark-blue">
              Zwei Wege — beliebig kombinierbar
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Manuell:</strong> Tragen Sie die Frachtführer-Daten direkt ins Formular ein.
              </li>
              <li>
                <strong>Automatisch:</strong> Laden Sie Dokumente hoch — die KI erkennt den Typ und füllt leere Felder automatisch.
              </li>
              <li>
                <strong>Gemischt:</strong> Schreiben Sie einige Felder und laden Sie Dokumente für den Rest hoch. Bereits ausgefüllte Felder bleiben unverändert; Sie können jederzeit nachträglich korrigieren.
              </li>
            </ul>
            <p className="mt-2 text-xs text-ec-grey-70">
              Für die Analyse wird mindestens ein hochgeladenes Dokument benötigt.
            </p>
          </div>

          {!hasAnyDoc && (
            <TestSetPicker value={testSet} onChange={setTestSet} />
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-6">
              {/* Form + upload side-by-side at lg+, stacked below */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Carrier form — always visible, fills from upload or manual entry */}
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold text-ec-dark-blue">
                      Frachtführer-Daten
                    </h2>
                    <p className="mt-1 text-sm text-ec-grey-70">
                      Werden aus hochgeladenen Dokumenten automatisch befüllt. Sie können jedes Feld manuell überschreiben oder korrigieren.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <CarrierForm
                      data={formData}
                      onChange={handleFormChange}
                    />
                  </CardContent>
                </Card>

                {/* Document upload */}
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold text-ec-dark-blue">
                      Dokumente hochladen
                    </h2>
                    <p className="mt-1 text-sm text-ec-grey-70">
                      Laden Sie Versicherungsnachweis, Transportlizenz, Briefkopf oder weitere Unterlagen hoch. Die KI erkennt den Typ automatisch und extrahiert relevante Felder.
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
              </div>

              {/* Document list — full width of the main column, below the two cards */}
              {uploadedDocs.length > 0 && (
                <Card>
                  <CardContent>
                    <DocumentList documents={uploadedDocs} analyzingDocId={analyzingDocId} />
                  </CardContent>
                </Card>
              )}

              {/* Live analysis terminal — full width of the main column */}
              <AiTerminal
                lines={classificationLog}
                isActive={isClassifying}
                activeDocName={analyzingDocName}
              />
            </div>

            {/* Sidebar: checklist */}
            <div className="space-y-4">
              <Card className="h-fit">
                <DocumentChecklist items={checklist} />
              </Card>
            </div>
          </div>

          {/* Continue-to-questions footer */}
          <div className="flex items-center justify-end gap-3 border-t border-ec-medium-grey pt-4">
            {!hasAnyDoc && (
              <span className="text-xs text-ec-grey-70">
                Mindestens ein Dokument erforderlich
              </span>
            )}
            <Button
              onClick={() => setStep(2)}
              size="lg"
              disabled={!hasAnyDoc || isUploading || isClassifying}
            >
              Weiter zu Kontextfragen
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Behavioral & context questions (pre-filled from first analysis) */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-ec-info/30 bg-ec-info/5 p-4 text-sm text-ec-grey-80">
            <h2 className="mb-2 font-semibold text-ec-dark-blue">
              Ergänzende Fragen zum Frachtführer
            </h2>
            <p>
              Hinweise, die die KI bereits aus den hochgeladenen Dokumenten erkannt hat, sind
              vorausgefüllt und mit <strong>KI</strong> markiert. Ergänzen Sie die übrigen Fragen
              aus Ihrer Erfahrung — die Antworten fließen in die vollständige Risikobewertung ein.
            </p>
          </div>

          <RiskQuestions answers={riskAnswers} onAnswer={handleRiskAnswer} />

          <div className="flex items-center justify-between gap-3 border-t border-ec-medium-grey pt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Zurück zu Daten
            </Button>
            <Button
              onClick={handleStartFullAnalysis}
              size="lg"
              disabled={isAnalyzing}
            >
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

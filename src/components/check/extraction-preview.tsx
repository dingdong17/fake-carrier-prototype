"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CarrierFormData } from "./carrier-form";

interface ExtractedInsuranceData {
  insuredCompany?: string | null;
  insurer?: string | null;
  policyNumber?: string | null;
  coveragePeriod?: { start?: string | null; end?: string | null } | null;
  coverageAmount?: { amount?: number | null; currency?: string | null; description?: string | null } | null;
  contactInfo?: { phone?: string | null; email?: string | null; address?: string | null } | null;
  coInsuredCompanies?: string[] | null;
  coverageType?: string | null;
  geographicScope?: string | null;
  [key: string]: unknown;
}

interface ExtractionPreviewProps {
  documentType: string;
  documentTypeLabelDe: string;
  extractedData: ExtractedInsuranceData;
  onAccept: (prefill: Partial<CarrierFormData>) => void;
  onDismiss: () => void;
  disabled?: boolean;
}

export function ExtractionPreview({
  documentType,
  documentTypeLabelDe,
  extractedData,
  onAccept,
  onDismiss,
  disabled,
}: ExtractionPreviewProps) {
  const fields: Array<{ label: string; value: string | null | undefined; formField?: keyof CarrierFormData }> = [];

  // Map known fields to form fields for carrier info pre-fill
  const CARRIER_FIELD_MAP: Record<string, { label: string; formField?: keyof CarrierFormData }> = {
    insuredCompany: { label: "Versichertes Unternehmen", formField: "carrierName" },
    companyName: { label: "Firmenname", formField: "carrierName" },
    vatIdCarrier: { label: "USt-IdNr. (Versicherungsnehmer)", formField: "carrierVatId" },
    vatId: { label: "USt-IdNr.", formField: "carrierVatId" },
    insurer: { label: "Versicherer", formField: "insurer" },
    policyNumber: { label: "Policennummer", formField: "policyNumber" },
    coverageType: { label: "Versicherungsart" },
    geographicScope: { label: "Geltungsbereich" },
    licenseNumber: { label: "Lizenznummer" },
    authority: { label: "Ausstellende Behörde" },
    legalForm: { label: "Rechtsform" },
    address: { label: "Adresse" },
    companyAddress: { label: "Firmenadresse" },
    phone: { label: "Telefon" },
    email: { label: "E-Mail" },
    driverName: { label: "Fahrername" },
    driverId: { label: "Ausweis-Nr." },
    licensePlate: { label: "Kennzeichen" },
    vehicleType: { label: "Fahrzeugtyp" },
    senderEmail: { label: "E-Mail Absender" },
    contactPerson: { label: "Ansprechpartner" },
    memberSince: { label: "Mitglied seit" },
  };

  // Insurance-cert specific complex fields
  if (documentType === "insurance-cert") {
    if (extractedData.coveragePeriod) {
      const cp = extractedData.coveragePeriod;
      if (cp.start) fields.push({ label: "Deckung von", value: cp.start, formField: "coverageStart" });
      if (cp.end) fields.push({ label: "Deckung bis", value: cp.end, formField: "coverageEnd" });
    }

    if (extractedData.coverageAmount) {
      const amount = extractedData.coverageAmount.amount;
      if (typeof amount === "number" && Number.isFinite(amount)) {
        fields.push({
          label: "Versicherungssumme",
          value: amount.toLocaleString("de-DE"),
          formField: "sumInsured",
        });
      }
    }

    if (extractedData.coInsuredCompanies && extractedData.coInsuredCompanies.length > 0) {
      fields.push({
        label: "Mitversicherte Unternehmen",
        value: extractedData.coInsuredCompanies.join("\n"),
        formField: "coInsured",
      });
    }
  }

  // Transport license validity period
  if (documentType === "transport-license" && extractedData.validityPeriod) {
    const vp = extractedData.validityPeriod as { start?: string; end?: string };
    if (vp.start) fields.push({ label: "Gültig von", value: vp.start });
    if (vp.end) fields.push({ label: "Gültig bis", value: vp.end });
  }

  // Generic: map all simple string/number fields
  for (const [key, value] of Object.entries(extractedData)) {
    // Skip complex/already-handled fields
    if (["coveragePeriod", "coverageAmount", "coInsuredCompanies", "validityPeriod",
         "contactInfo", "isVerkehrshaftung", "vatIdInsurer", "bankDetails"].includes(key)) continue;
    if (value === null || value === undefined || typeof value === "object") continue;

    const mapped = CARRIER_FIELD_MAP[key];
    const label = mapped?.label || key;
    const stringValue = String(value);

    // Skip if already added
    if (fields.some((f) => f.label === label)) continue;

    fields.push({ label, value: stringValue, formField: mapped?.formField });
  }

  // Contact info (if present)
  if (extractedData.contactInfo) {
    const ci = extractedData.contactInfo;
    if (ci.address && !fields.some((f) => f.label.includes("Adresse"))) {
      fields.push({ label: "Adresse", value: ci.address });
    }
    if (ci.phone && !fields.some((f) => f.label.includes("Telefon"))) {
      fields.push({ label: "Telefon", value: ci.phone });
    }
    if (ci.email && !fields.some((f) => f.label.includes("E-Mail"))) {
      fields.push({ label: "E-Mail", value: ci.email });
    }
  }

  const handleAccept = () => {
    const prefill: Partial<CarrierFormData> = {};
    for (const field of fields) {
      if (field.value && field.formField) {
        prefill[field.formField] = field.value;
      }
    }
    onAccept(prefill);
  };

  const nonEmptyFields = fields.filter((f) => f.value);

  if (nonEmptyFields.length === 0) {
    return null;
  }

  return (
    <Card className="border-ec-mint/40 bg-ec-mint/5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="success">{documentTypeLabelDe} erkannt</Badge>
            <span className="text-sm text-ec-grey-70">
              Folgende Daten wurden extrahiert:
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {nonEmptyFields.map((field, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5 border border-ec-medium-grey"
            >
              <span className="text-sm text-ec-grey-70">{field.label}</span>
              <span className="text-sm font-medium text-ec-grey-80">
                {field.value}
              </span>
            </div>
          ))}
        </div>

        {disabled ? (
          <div className="flex items-center gap-2 pt-2 text-sm text-ec-grey-70">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ec-dark-blue border-t-transparent" />
            Weitere Dokumente werden noch analysiert...
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-medium text-ec-dark-blue">
              Sollen die erkannten Daten übernommen werden?
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Nein, verwerfen
              </Button>
              <Button variant="primary" size="sm" onClick={handleAccept}>
                Ja, Daten übernehmen
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

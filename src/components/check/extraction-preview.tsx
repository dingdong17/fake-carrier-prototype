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
}

export function ExtractionPreview({
  documentType,
  documentTypeLabelDe,
  extractedData,
  onAccept,
  onDismiss,
}: ExtractionPreviewProps) {
  const fields: Array<{ label: string; value: string | null | undefined; formField?: keyof CarrierFormData }> = [];

  if (documentType === "insurance-cert") {
    fields.push(
      { label: "Versichertes Unternehmen", value: extractedData.insuredCompany as string | null, formField: "carrierName" },
      { label: "USt-IdNr.", value: extractedData.vatId as string | null, formField: "carrierVatId" },
      { label: "Versicherer", value: extractedData.insurer as string | null, formField: "insurer" },
      { label: "Policennummer", value: extractedData.policyNumber as string | null, formField: "policyNumber" },
    );

    if (extractedData.coveragePeriod) {
      fields.push(
        { label: "Deckung von", value: extractedData.coveragePeriod.start, formField: "coverageStart" },
        { label: "Deckung bis", value: extractedData.coveragePeriod.end, formField: "coverageEnd" },
      );
    }

    if (extractedData.coverageAmount) {
      const amount = extractedData.coverageAmount.amount;
      const currency = extractedData.coverageAmount.currency || "EUR";
      fields.push({
        label: "Versicherungssumme",
        value: amount != null ? `${amount.toLocaleString("de-DE")} ${currency}` : null,
        formField: "sumInsured",
      });
    }

    if (extractedData.coverageAmount?.description) {
      fields.push({
        label: "Versicherungssumme (Details)",
        value: extractedData.coverageAmount.description,
      });
    }

    if (extractedData.coInsuredCompanies && extractedData.coInsuredCompanies.length > 0) {
      fields.push({
        label: "Mitversicherte Unternehmen",
        value: extractedData.coInsuredCompanies.join("\n"),
        formField: "coInsured",
      });
    }

    if (extractedData.coverageType) {
      fields.push({ label: "Versicherungsart", value: extractedData.coverageType });
    }

    if (extractedData.geographicScope) {
      fields.push({ label: "Geltungsbereich", value: extractedData.geographicScope });
    }

    if (extractedData.contactInfo?.address) {
      fields.push({ label: "Adresse (Versicherer)", value: extractedData.contactInfo.address });
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
      </div>
    </Card>
  );
}

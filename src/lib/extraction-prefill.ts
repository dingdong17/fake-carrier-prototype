import type { CarrierFormData } from "@/components/check/carrier-form";

type ExtractedData = Record<string, unknown>;

const FIELD_MAP: Record<string, keyof CarrierFormData> = {
  insuredCompany: "carrierName",
  companyName: "carrierName",
  vatIdCarrier: "carrierVatId",
  vatId: "carrierVatId",
  insurer: "insurer",
  policyNumber: "policyNumber",
  website: "carrierWebsite",
  senderEmail: "carrierEmail",
  email: "carrierEmail",
};

function toNonEmptyString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function formatCoverageAmount(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { amount?: number | null };
  if (typeof v.amount === "number" && Number.isFinite(v.amount)) {
    return v.amount.toLocaleString("de-DE");
  }
  return null;
}

export function extractCarrierPrefill(
  documentType: string,
  data: ExtractedData
): Partial<CarrierFormData> {
  const prefill: Partial<CarrierFormData> = {};

  for (const [key, formField] of Object.entries(FIELD_MAP)) {
    if (prefill[formField]) continue;
    const value = toNonEmptyString(data[key]);
    if (value) prefill[formField] = value;
  }

  if (!prefill.carrierEmail && data.contactInfo && typeof data.contactInfo === "object") {
    const ci = data.contactInfo as { email?: unknown };
    const email = toNonEmptyString(ci.email);
    if (email) prefill.carrierEmail = email;
  }

  if (documentType === "insurance-cert") {
    if (data.coveragePeriod && typeof data.coveragePeriod === "object") {
      const cp = data.coveragePeriod as { start?: unknown; end?: unknown };
      const start = toNonEmptyString(cp.start);
      const end = toNonEmptyString(cp.end);
      if (start) prefill.coverageStart = start;
      if (end) prefill.coverageEnd = end;
    }

    const sum = formatCoverageAmount(data.coverageAmount);
    if (sum) prefill.sumInsured = sum;

    if (Array.isArray(data.coInsuredCompanies)) {
      const items = data.coInsuredCompanies
        .map((x) => toNonEmptyString(x))
        .filter((x): x is string => x !== null);
      if (items.length > 0) prefill.coInsured = items.join("\n");
    }
  }

  return prefill;
}

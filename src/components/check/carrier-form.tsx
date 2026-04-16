"use client";

import { Input } from "@/components/ui/input";

export interface CarrierFormData {
  carrierName: string;
  carrierCountry: string;
  carrierVatId: string;
  insurer: string;
  policyNumber: string;
  coverageStart: string;
  coverageEnd: string;
  sumInsured: string;
  coInsured: string;
}

interface CarrierFormProps {
  data: CarrierFormData;
  onChange: (field: keyof CarrierFormData, value: string) => void;
  disabled?: boolean;
}

export function CarrierForm({ data, onChange, disabled }: CarrierFormProps) {
  return (
    <div className="space-y-6">
      {/* Core carrier info */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-ec-grey-70">
          Frachtführer
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Firmenname *"
            value={data.carrierName}
            onChange={(e) => onChange("carrierName", e.target.value)}
            placeholder="z.B. Transport GmbH"
            required
            disabled={disabled}
          />
          <Input
            label="Land"
            value={data.carrierCountry}
            onChange={(e) => onChange("carrierCountry", e.target.value)}
            placeholder="z.B. Deutschland"
            disabled={disabled}
          />
          <Input
            label="USt-IdNr."
            value={data.carrierVatId}
            onChange={(e) => onChange("carrierVatId", e.target.value)}
            placeholder="z.B. DE123456789"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Insurance details (optional, can be auto-filled) */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-ec-grey-70">
          Versicherungsdaten (optional)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Versicherer"
            value={data.insurer}
            onChange={(e) => onChange("insurer", e.target.value)}
            placeholder="z.B. Allianz Versicherungs-AG"
            disabled={disabled}
          />
          <Input
            label="Policennummer"
            value={data.policyNumber}
            onChange={(e) => onChange("policyNumber", e.target.value)}
            placeholder="z.B. VKH-2024-12345"
            disabled={disabled}
          />
          <Input
            label="Versicherungssumme"
            value={data.sumInsured}
            onChange={(e) => onChange("sumInsured", e.target.value)}
            placeholder="z.B. 1.000.000 EUR"
            disabled={disabled}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Deckung von"
            value={data.coverageStart}
            onChange={(e) => onChange("coverageStart", e.target.value)}
            placeholder="z.B. 01.01.2026"
            disabled={disabled}
          />
          <Input
            label="Deckung bis"
            value={data.coverageEnd}
            onChange={(e) => onChange("coverageEnd", e.target.value)}
            placeholder="z.B. 31.12.2026"
            disabled={disabled}
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-ec-grey-80">
            Mitversicherte Unternehmen
          </label>
          <textarea
            value={data.coInsured}
            onChange={(e) => onChange("coInsured", e.target.value)}
            placeholder="Ein Unternehmen pro Zeile"
            disabled={disabled}
            rows={3}
            className="mt-1 w-full rounded-lg border border-ec-grey-60 px-3 py-2 text-sm text-ec-grey-80 placeholder:text-ec-grey-70 focus:border-ec-light-blue focus:outline-none focus:ring-2 focus:ring-ec-light-blue/20 disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}

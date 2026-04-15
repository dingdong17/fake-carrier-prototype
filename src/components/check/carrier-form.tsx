"use client";

import { Input } from "@/components/ui/input";

interface CarrierFormProps {
  carrierName: string;
  carrierCountry: string;
  carrierVatId: string;
  onChange: (field: "carrierName" | "carrierCountry" | "carrierVatId", value: string) => void;
  disabled?: boolean;
}

export function CarrierForm({
  carrierName,
  carrierCountry,
  carrierVatId,
  onChange,
  disabled,
}: CarrierFormProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Input
        label="Firmenname *"
        value={carrierName}
        onChange={(e) => onChange("carrierName", e.target.value)}
        placeholder="z.B. Transport GmbH"
        required
        disabled={disabled}
      />
      <Input
        label="Land"
        value={carrierCountry}
        onChange={(e) => onChange("carrierCountry", e.target.value)}
        placeholder="z.B. Deutschland"
        disabled={disabled}
      />
      <Input
        label="USt-IdNr."
        value={carrierVatId}
        onChange={(e) => onChange("carrierVatId", e.target.value)}
        placeholder="z.B. DE123456789"
        disabled={disabled}
      />
    </div>
  );
}

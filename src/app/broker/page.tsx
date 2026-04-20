"use client";
import { useState } from "react";
import { ClientPickerModal } from "@/components/check/client-picker-modal";

export default function BrokerHome() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState<string | null>(null);

  const makeVoucher = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    setVoucherCode(s);
  };

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ec-dark-blue">Broker-Start</h1>
        <p className="text-sm text-ec-grey-70">
          Sie führen Prüfungen im Auftrag Ihrer Kunden durch. Wählen Sie zuerst
          den Kunden aus — das Ergebnis wird diesem Kunden zugeordnet. Broker-
          Prüfungen verbrauchen keine Kunden-Credits.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-ec-medium-grey bg-white p-6 text-left shadow-sm hover:border-ec-dark-blue"
            onClick={() => setPickerOpen(true)}
          >
            <h2 className="text-lg font-semibold text-ec-dark-blue">Neue Prüfung</h2>
            <p className="mt-1 text-sm text-ec-grey-70">
              Kunde auswählen, Dokumente hochladen, Prüfung starten.
            </p>
          </button>
          <div className="rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ec-dark-blue">Voucher-Code (Demo)</h2>
            <p className="mt-1 text-sm text-ec-grey-70">
              Generieren Sie einen Code und reichen Sie ihn an Ihre Kunden weiter.
              (Noch nicht einlösbar — UI-Platzhalter, siehe BL-041.)
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={voucherCode ?? ""}
                placeholder="—"
                className="flex-1 rounded border border-ec-medium-grey bg-ec-light-grey px-2 py-1 text-center font-mono"
              />
              <button
                type="button"
                onClick={makeVoucher}
                className="rounded bg-ec-dark-blue px-3 py-1 text-sm text-white"
              >
                Code generieren
              </button>
            </div>
          </div>
        </div>
      </div>
      <ClientPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}

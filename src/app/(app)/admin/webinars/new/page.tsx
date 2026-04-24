import { WebinarSlotForm } from "@/components/admin/webinar-slot-form";

export default function NewWebinarSlotPage() {
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">Neuer Webinar-Termin</h1>
      <WebinarSlotForm mode="create" />
    </main>
  );
}

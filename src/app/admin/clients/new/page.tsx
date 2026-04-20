// src/app/admin/clients/new/page.tsx
import { ClientForm } from "@/components/admin/client-form";

export default function NewClientPage() {
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">Neuer Kunde</h1>
      <ClientForm />
    </main>
  );
}

// src/app/admin/users/new/page.tsx
import { UserForm } from "@/components/admin/user-form";

export default function NewUserPage() {
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-ec-dark-blue">
        Admin oder Broker anlegen
      </h1>
      <UserForm />
    </main>
  );
}

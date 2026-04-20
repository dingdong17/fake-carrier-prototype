import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import BacklogPageClient from "./page-client";

export default async function BacklogPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/login");
  }

  return <BacklogPageClient />;
}

import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import FeedbackPageClient from "./page-client";

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/login");
  }

  return <FeedbackPageClient />;
}

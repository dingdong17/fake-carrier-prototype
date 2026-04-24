// src/app/neue-pruefung/route.ts
import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  if (!session?.user) return NextResponse.redirect(new URL("/login", base));
  const { role, clientSlug } = session.user;
  if (role === "client" && clientSlug) {
    return NextResponse.redirect(new URL(`/client/${clientSlug}/check`, base));
  }
  if (role === "broker") return NextResponse.redirect(new URL("/broker", base));
  if (role === "admin") return NextResponse.redirect(new URL("/admin", base));
  return NextResponse.redirect(new URL("/login", base));
}

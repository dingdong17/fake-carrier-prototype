import { NextResponse } from "next/server";

function isSafeCallbackPath(u: string): boolean {
  return /^\/api\/auth\/callback\/[a-z]+\?/.test(u);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const u = form.get("u");

  if (typeof u !== "string" || !isSafeCallbackPath(u)) {
    return NextResponse.redirect(new URL("/auth/confirm", req.url), 303);
  }

  // Build absolute URL so the 303 Location header is unambiguous; the path is
  // already validated to be same-origin (starts with /api/auth/callback/...).
  return NextResponse.redirect(new URL(u, req.url), 303);
}

// src/proxy.ts — Next.js 16 routing middleware (formerly middleware.ts)
import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_EXACT = new Set(["/", "/login", "/login/check-email"]);
const PUBLIC_PREFIX = ["/api/auth/", "/_next/", "/favicon"];

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true;
  return PUBLIC_PREFIX.some((p) => path.startsWith(p));
}

function roleHome(role: string, clientSlug: string | null): string {
  if (role === "admin") return "/admin";
  if (role === "broker") return "/broker";
  if (role === "client" && clientSlug) return `/client/${clientSlug}`;
  return "/login";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static + auth endpoints — always pass through.
  if (isPublic(pathname)) return NextResponse.next();

  const session = await auth();

  if (!session?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const { role, clientSlug } = session.user;

  // Admin-only areas
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(roleHome(role, clientSlug), req.url));
  }

  // Broker start page — admin is allowed to visit too.
  if (pathname.startsWith("/broker") && role !== "broker" && role !== "admin") {
    return NextResponse.redirect(new URL(roleHome(role, clientSlug), req.url));
  }

  // Client-scoped routes
  const clientMatch = pathname.match(/^\/client\/([^/]+)(\/|$)/);
  if (clientMatch) {
    const slug = clientMatch[1];
    if (role === "client" && clientSlug !== slug) {
      return NextResponse.redirect(new URL(roleHome(role, clientSlug), req.url));
    }
    // admin / broker: any slug allowed (flat access)
  }

  // Admin-only pages + API routes
  // Special case: /api/feedback POST (submit) is open to any authed user;
  // handler re-checks method since proxy shouldn't read request bodies.

  // Broker + admin both need GET /api/admin/clients for the client-picker modal.
  const isBrokerReadableAdminApi =
    pathname === "/api/admin/clients" && req.method === "GET";

  const adminOnlyPaths =
    pathname.startsWith("/backlog") ||
    pathname.startsWith("/feedback") ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/backlog");

  if (adminOnlyPaths && role !== "admin" && !isBrokerReadableAdminApi) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isBrokerReadableAdminApi && role !== "admin" && role !== "broker") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (pathname.startsWith("/api/feedback")) {
    if (req.method !== "POST" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on every request except obvious static file paths.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)).*)",
  ],
};

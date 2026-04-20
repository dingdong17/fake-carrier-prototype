// src/lib/auth/session.ts
import { auth } from "./config";
import type { Session } from "next-auth";

export type Role = "admin" | "broker" | "client";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly kind: "unauthenticated" | "forbidden"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getSessionUser(): Promise<Session["user"] | null> {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireSession(): Promise<Session["user"]> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Not authenticated", "unauthenticated");
  return user;
}

export async function requireRole(
  role: Role | Role[]
): Promise<Session["user"]> {
  const user = await requireSession();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) {
    throw new AuthError(
      `Forbidden: requires role ${allowed.join("|")}, got ${user.role}`,
      "forbidden"
    );
  }
  return user;
}

export function assertClientScope(
  user: Session["user"],
  slug: string
): void {
  if (user.role === "admin" || user.role === "broker") return;
  if (user.role === "client" && user.clientSlug === slug) return;
  throw new AuthError(
    `Forbidden: user not allowed on client scope ${slug}`,
    "forbidden"
  );
}

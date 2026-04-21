// src/lib/auth/config.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Email from "next-auth/providers/email";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendMagicLink } from "./send-magic-link";
import { isTrustedDomain } from "./trusted-domains";

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    // emailVerified is stored as text (ISO string) in our schema; the adapter
    // works fine at runtime. The cast suppresses a TS type mismatch because
    // @auth/drizzle-adapter's type definition requires SQLiteTimestamp —
    // aligning the schema column type is a separate migration task.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usersTable: users as any,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: [
    Email({
      from: process.env.EMAIL_FROM,
      // Dummy SMTP config — nodemailer's createTransport refuses to init
      // without a `server`, even though sendVerificationRequest below
      // overrides the actual delivery path. Our sendMagicLink uses Resend
      // (or dev-stub console logging), so this server is never contacted.
      server: {
        host: "localhost",
        port: 25,
        auth: { user: "unused", pass: "unused" },
      },
      sendVerificationRequest: sendMagicLink,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Trusted-domain policy: covermesh (and later Ecclesia / SCHUNCK)
      // must use Microsoft SSO, not magic-link. The login form catches
      // this client-side; this is the server-side backstop for direct
      // POSTs to /api/auth/signin/email. Auth.js wraps a `false` return
      // as AccessDenied; with pages.error = "/login", the user lands on
      // /login?error=AccessDenied.
      if (account?.provider === "email" && user.email && isTrustedDomain(user.email)) {
        return false;
      }

      // Entra SSO tenant + domain validation is added in Task 4 as an
      // `account?.provider === "microsoft-entra-id"` branch above this line.

      return true;
    },

    async session({ session, user }) {
      const u = user as typeof user & { role: string; clientId: string | null };
      session.user.role = u.role as "admin" | "broker" | "client";
      session.user.clientId = u.clientId;

      if (u.clientId) {
        const c = await db
          .select({ slug: clients.slug })
          .from(clients)
          .where(eq(clients.id, u.clientId))
          .get();
        session.user.clientSlug = c?.slug ?? null;
      } else {
        session.user.clientSlug = null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

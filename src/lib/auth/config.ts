// src/lib/auth/config.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Email from "next-auth/providers/email";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendMagicLink } from "./send-magic-link";
import { isTrustedDomain } from "./trusted-domains";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { validateEntraSignIn } from "./entra-tenants";

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
    MicrosoftEntraId({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: "https://login.microsoftonline.com/organizations/v2.0",
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        // Auth.js v5 passes this result straight to the Drizzle adapter's
        // createUser. Our users.role is NOT NULL with no default, so we must
        // supply it here for first-time Entra users. Existing users bypass
        // createUser entirely (account linking on matched email).
        return {
          id: profile.sub ?? profile.oid,
          name: profile.name,
          email: profile.email ?? profile.preferred_username,
          image: null,
          role: "broker" as const,
          clientId: null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Trusted-domain policy: covermesh (and later Ecclesia / SCHUNCK)
      // must use Microsoft SSO, not magic-link. The login form catches
      // this client-side; this is the server-side backstop for direct
      // POSTs to /api/auth/signin/email. Auth.js wraps a `false` return
      // as AccessDenied; with pages.error = "/login", the user lands on
      // /login?error=AccessDenied.
      if (account?.provider === "email" && user.email && isTrustedDomain(user.email)) {
        return false;
      }

      // Entra SSO: validate the tenant id (tid claim) against the code-local
      // allowlist AND confirm the email domain matches the tenant's expected
      // domain. Failure logs server-side (no detail leaked to the client) and
      // returns false → /login?error=AccessDenied.
      if (account?.provider === "microsoft-entra-id") {
        let tid = (profile as { tid?: string } | null | undefined)?.tid ?? "";
        if (!tid && account.id_token) {
          try {
            const payload = JSON.parse(
              Buffer.from(account.id_token.split(".")[1], "base64url").toString("utf8")
            );
            tid = typeof payload.tid === "string" ? payload.tid : "";
          } catch {
            // fall through — empty tid triggers unknown_tenant below
          }
        }

        const email = user.email ?? "";
        const result = validateEntraSignIn({ tid, email });
        if (!result.ok) {
          console.warn(
            `[entra] reject sign-in: tid=${tid || "(missing)"} email=${email} reason=${result.reason}`
          );
          return false;
        }
      }

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

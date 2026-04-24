import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "tenant";
  let n = 1;
  while (true) {
    const existing = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.slug, slug))
      .get();
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`.slice(0, 48);
  }
}

/**
 * Look up the tenant (clients row) that already serves a given email domain,
 * by finding any existing user with a matching email suffix. Returns the
 * client.id if found, else null.
 */
export async function findClientByEmailDomain(
  domain: string
): Promise<string | null> {
  if (!domain) return null;
  const suffix = `%@${domain}`;
  const hit = await db
    .select({ clientId: users.clientId })
    .from(users)
    .where(like(users.email, suffix))
    .get();
  return hit?.clientId ?? null;
}

/**
 * Provision (or reuse) a client and create the user. Returns the new user's id
 * and the resolved clientId. The caller is responsible for firing the
 * magic-link email — this function only mutates the DB.
 */
export async function provisionDemoUser(params: {
  email: string;
  name: string;
  company: string;
}): Promise<{ userId: string; clientId: string; createdNewClient: boolean }> {
  const email = params.email.toLowerCase();
  const domain = emailDomain(email);

  // Reuse existing user if this email is already registered anywhere
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existingUser) {
    return {
      userId: existingUser.id,
      clientId: existingUser.clientId ?? "",
      createdNewClient: false,
    };
  }

  let clientId = await findClientByEmailDomain(domain);
  let createdNewClient = false;
  if (!clientId) {
    clientId = generateId();
    const slug = await uniqueSlug(slugify(params.company));
    await db.insert(clients).values({
      id: clientId,
      slug,
      name: params.company,
      creditBalance: 50, // starter credits for demo tenants
    });
    createdNewClient = true;
  }

  const userId = generateId();
  await db.insert(users).values({
    id: userId,
    email,
    name: params.name,
    role: "client",
    clientId,
  });

  return { userId, clientId, createdNewClient };
}

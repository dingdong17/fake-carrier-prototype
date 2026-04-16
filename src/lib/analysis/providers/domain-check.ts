/**
 * Domain Age & WHOIS Check Provider
 *
 * Uses RDAP (Registration Data Access Protocol) — the official IETF
 * replacement for WHOIS. Free, no API key, returns structured JSON.
 */

export interface DomainCheckResult {
  domain: string;
  exists: boolean;
  creationDate: string | null;
  expirationDate: string | null;
  ageInDays: number | null;
  isYoung: boolean;
  registrar: string | null;
  error: string | null;
}

const YOUNG_DOMAIN_THRESHOLD_DAYS = 180; // 6 months

export function extractDomainFromEmail(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  const parts = email.split("@");
  return parts[1]?.toLowerCase() || null;
}

export function extractDomainFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    let cleaned = url.trim().toLowerCase();
    if (!cleaned.startsWith("http")) {
      cleaned = "https://" + cleaned;
    }
    const parsed = new URL(cleaned);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    // Try bare domain
    const bare = url.trim().toLowerCase().replace(/^www\./, "").split("/")[0];
    return bare.includes(".") ? bare : null;
  }
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Look up the TLD's RDAP bootstrap server.
 * IANA maintains a bootstrap file at https://data.iana.org/rdap/dns.json
 * For simplicity, we use known RDAP servers for common TLDs.
 */
function getRdapServer(domain: string): string {
  const tld = domain.split(".").pop()?.toLowerCase() || "";
  const servers: Record<string, string> = {
    com: "https://rdap.verisign.com/com/v1",
    net: "https://rdap.verisign.com/net/v1",
    org: "https://rdap.org/org/v1",
    de: "https://rdap.denic.de",
    pl: "https://rdap.dns.pl",
    cz: "https://rdap.nic.cz",
    ro: "https://rdap.rotld.ro",
    eu: "https://rdap.eurid.eu",
    at: "https://rdap.nic.at",
    ch: "https://rdap.nic.ch",
    nl: "https://rdap.sidn.nl",
    fr: "https://rdap.nic.fr",
    it: "https://rdap.nic.it",
    es: "https://rdap.nic.es",
    sk: "https://rdap.sk-nic.sk",
    hu: "https://rdap.nic.hu",
    bg: "https://rdap.register.bg",
  };
  return servers[tld] || `https://rdap.org/${tld}/v1`;
}

export async function checkDomainAge(domain: string): Promise<DomainCheckResult> {
  if (!domain) {
    return {
      domain: "",
      exists: false,
      creationDate: null,
      expirationDate: null,
      ageInDays: null,
      isYoung: false,
      registrar: null,
      error: "Keine Domain angegeben",
    };
  }

  try {
    const server = getRdapServer(domain);
    const url = `${server}/domain/${domain}`;

    const response = await fetch(url, {
      headers: { Accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          domain,
          exists: false,
          creationDate: null,
          expirationDate: null,
          ageInDays: null,
          isYoung: false,
          registrar: null,
          error: null,
        };
      }
      throw new Error(`RDAP: HTTP ${response.status}`);
    }

    const data = await response.json();

    // Extract dates from RDAP events
    let creationDate: string | null = null;
    let expirationDate: string | null = null;

    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        if (event.eventAction === "registration") {
          creationDate = event.eventDate;
        }
        if (event.eventAction === "expiration") {
          expirationDate = event.eventDate;
        }
      }
    }

    // Extract registrar from entities
    let registrar: string | null = null;
    if (data.entities && Array.isArray(data.entities)) {
      const registrarEntity = data.entities.find(
        (e: { roles?: string[] }) => e.roles?.includes("registrar")
      );
      if (registrarEntity?.vcardArray?.[1]) {
        const fnEntry = registrarEntity.vcardArray[1].find(
          (entry: string[]) => entry[0] === "fn"
        );
        if (fnEntry) {
          registrar = fnEntry[3] || null;
        }
      }
      // Fallback: use handle or name
      if (!registrar && registrarEntity) {
        registrar = registrarEntity.handle || registrarEntity.name || null;
      }
    }

    let ageInDays: number | null = null;
    let isYoung = false;

    if (creationDate) {
      const created = new Date(creationDate);
      ageInDays = daysBetween(created, new Date());
      isYoung = ageInDays < YOUNG_DOMAIN_THRESHOLD_DAYS;
    }

    return {
      domain,
      exists: true,
      creationDate,
      expirationDate,
      ageInDays,
      isYoung,
      registrar,
      error: null,
    };
  } catch (err) {
    // Fallback: try a simple DNS check to see if domain exists at all
    try {
      const dnsCheck = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
        signal: AbortSignal.timeout(5000),
      });
      const dnsData = await dnsCheck.json();
      const dnsExists = dnsData.Status === 0 && dnsData.Answer?.length > 0;

      return {
        domain,
        exists: dnsExists,
        creationDate: null,
        expirationDate: null,
        ageInDays: null,
        isYoung: false,
        registrar: null,
        error: `RDAP nicht verfügbar, DNS-Check: ${dnsExists ? "Domain existiert" : "Domain nicht gefunden"}`,
      };
    } catch {
      return {
        domain,
        exists: false,
        creationDate: null,
        expirationDate: null,
        ageInDays: null,
        isYoung: false,
        registrar: null,
        error: err instanceof Error ? err.message : "Domain-Prüfung fehlgeschlagen",
      };
    }
  }
}

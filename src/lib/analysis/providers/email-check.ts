/**
 * Email Verification Provider
 *
 * Checks: freemail detection, domain existence (DNS), domain-company match.
 * Uses Google DNS API (free, no key) for domain resolution.
 */

export const FREEMAIL_DOMAINS = [
  "gmail.com", "googlemail.com",
  "gmx.de", "gmx.net", "gmx.at", "gmx.ch",
  "web.de",
  "hotmail.com", "hotmail.de", "hotmail.co.uk",
  "outlook.com", "outlook.de",
  "live.com", "live.de",
  "yahoo.com", "yahoo.de",
  "aol.com",
  "t-online.de",
  "freenet.de",
  "arcor.de",
  "icloud.com", "me.com",
  "mail.com",
  "yandex.com", "yandex.ru",
  "protonmail.com", "proton.me",
  "zoho.com",
  "tutanota.com", "tuta.io",
  "wp.pl", "o2.pl", "interia.pl", "onet.pl",
  "seznam.cz", "email.cz", "centrum.cz",
  "yahoo.co.uk", "yahoo.fr",
];

export interface EmailCheckResult {
  email: string;
  domain: string;
  isFreemail: boolean;
  freemailProvider: string | null;
  domainExists: boolean;
  domainMatchesCompany: boolean | null;
  error: string | null;
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(gmbh|ag|kg|ohg|e\.k\.|ug|se|sp\.\s*z\s*o\.o\.|s\.r\.o\.|ltd\.?|inc\.?)\b/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .trim();
}

export async function checkEmail(
  email: string,
  companyName?: string
): Promise<EmailCheckResult> {
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[1]) {
    return {
      email,
      domain: "",
      isFreemail: false,
      freemailProvider: null,
      domainExists: false,
      domainMatchesCompany: null,
      error: "Ungültiges E-Mail-Format",
    };
  }

  const domain = parts[1].toLowerCase();

  // Freemail check
  const isFreemail = FREEMAIL_DOMAINS.includes(domain);
  const freemailProvider = isFreemail ? domain : null;

  // DNS check — does the domain exist?
  let domainExists = false;
  try {
    const mxRes = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, {
      signal: AbortSignal.timeout(8000),
    });
    const mxData = await mxRes.json();
    if (mxData.Status === 0 && mxData.Answer?.length > 0) {
      domainExists = true;
    } else {
      // Fallback: check A record
      const aRes = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
        signal: AbortSignal.timeout(5000),
      });
      const aData = await aRes.json();
      domainExists = aData.Status === 0 && aData.Answer?.length > 0;
    }
  } catch {
    // Can't determine — assume exists to avoid false positives
    domainExists = true;
  }

  // Company name match
  let domainMatchesCompany: boolean | null = null;
  if (companyName && !isFreemail) {
    const domainBase = domain.split(".")[0]; // "transport-mueller" from "transport-mueller.de"
    const normalizedDomain = normalizeForMatch(domainBase);
    const normalizedCompany = normalizeForMatch(companyName);

    if (normalizedDomain && normalizedCompany) {
      domainMatchesCompany =
        normalizedCompany.includes(normalizedDomain) ||
        normalizedDomain.includes(normalizedCompany);
    }
  }

  return {
    email,
    domain,
    isFreemail,
    freemailProvider,
    domainExists,
    domainMatchesCompany,
    error: null,
  };
}

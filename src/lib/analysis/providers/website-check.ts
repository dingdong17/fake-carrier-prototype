/**
 * Website Existence Check Provider
 *
 * Checks if a company's website exists and is reachable.
 * Tries multiple URL variations (with/without www, http/https).
 */

export interface WebsiteCheckResult {
  exists: boolean;
  url: string | null;
  statusCode: number | null;
  redirectsTo: string | null;
  error: string | null;
}

/**
 * Extract a plausible domain from a company name.
 * "VE-Log GmbH" → tries "ve-log.de", "ve-log.com", "velog.de", "velog.com"
 */
function buildDomainCandidates(companyName: string, country?: string): string[] {
  // Strip legal form suffixes
  const stripped = companyName
    .replace(/\b(GmbH|AG|KG|OHG|e\.K\.|UG|SE|Sp\.\s*z\s*o\.o\.|s\.r\.o\.|S\.A\.|B\.V\.|Ltd\.?|Inc\.?|Corp\.?|Srl|SAS)\b/gi, "")
    .trim();

  // Normalize to domain-friendly format
  const base = stripped
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Also try without hyphens
  const noHyphens = base.replace(/-/g, "");

  // Country-specific TLDs
  const countryTlds: Record<string, string[]> = {
    deutschland: [".de", ".com"],
    germany: [".de", ".com"],
    de: [".de", ".com"],
    polen: [".pl", ".com"],
    poland: [".pl", ".com"],
    pl: [".pl", ".com"],
    tschechien: [".cz", ".com"],
    czech: [".cz", ".com"],
    cz: [".cz", ".com"],
    rumänien: [".ro", ".com"],
    romania: [".ro", ".com"],
    ro: [".ro", ".com"],
  };

  const tlds = country
    ? countryTlds[country.toLowerCase()] || [".com", ".de", ".eu"]
    : [".com", ".de", ".eu"];

  const candidates: string[] = [];
  for (const domain of [base, noHyphens]) {
    if (!domain) continue;
    for (const tld of tlds) {
      candidates.push(`${domain}${tld}`);
    }
  }

  return [...new Set(candidates)];
}

async function checkUrl(url: string): Promise<{ ok: boolean; status: number; redirectUrl?: string }> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "FakeCarrierCheck/1.0 (company-verification)",
      },
    });

    return {
      ok: response.ok || response.status === 403, // 403 = exists but blocks bots
      status: response.status,
      redirectUrl: response.redirected ? response.url : undefined,
    };
  } catch {
    // HEAD might be blocked, try GET
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "FakeCarrierCheck/1.0 (company-verification)",
        },
      });

      return {
        ok: response.ok || response.status === 403,
        status: response.status,
        redirectUrl: response.redirected ? response.url : undefined,
      };
    } catch {
      return { ok: false, status: 0 };
    }
  }
}

export async function checkWebsiteExists(
  companyName: string,
  country?: string,
  knownWebsite?: string
): Promise<WebsiteCheckResult> {
  // If we have a known website URL, check that first
  if (knownWebsite) {
    const url = knownWebsite.startsWith("http") ? knownWebsite : `https://${knownWebsite}`;
    const result = await checkUrl(url);
    if (result.ok) {
      return {
        exists: true,
        url,
        statusCode: result.status,
        redirectsTo: result.redirectUrl || null,
        error: null,
      };
    }
  }

  // Try domain candidates derived from company name
  const candidates = buildDomainCandidates(companyName, country);

  for (const domain of candidates) {
    for (const protocol of ["https://", "https://www."]) {
      const url = `${protocol}${domain}`;
      const result = await checkUrl(url);
      if (result.ok) {
        return {
          exists: true,
          url,
          statusCode: result.status,
          redirectsTo: result.redirectUrl || null,
          error: null,
        };
      }
    }
  }

  return {
    exists: false,
    url: null,
    statusCode: null,
    redirectsTo: null,
    error: `Keine Webseite gefunden. Geprüfte Domains: ${candidates.join(", ")}`,
  };
}

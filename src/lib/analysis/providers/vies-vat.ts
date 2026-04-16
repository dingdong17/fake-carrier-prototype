/**
 * VIES VAT Validation Provider
 *
 * Validates EU VAT numbers against the official European Commission
 * VIES (VAT Information Exchange System) REST API.
 *
 * No API key required — this is a free public service.
 * Endpoint: https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{country}/vat/{number}
 */

export interface ViesValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  registeredName: string | null;
  registeredAddress: string | null;
  error: string | null;
}

/**
 * Parse a VAT ID string into country code and number.
 * Handles formats like: "DE123456789", "DE 123 456 789", "PL1234567890"
 */
function parseVatId(vatId: string): { countryCode: string; number: string } | null {
  const cleaned = vatId.replace(/[\s.-]/g, "").toUpperCase();

  // Match 2-letter country code + digits (and some countries use letters too)
  const match = cleaned.match(/^([A-Z]{2})(.+)$/);
  if (!match) return null;

  return {
    countryCode: match[1],
    number: match[2],
  };
}

export async function validateVatNumber(vatId: string): Promise<ViesValidationResult> {
  const parsed = parseVatId(vatId);
  if (!parsed) {
    return {
      valid: false,
      countryCode: "",
      vatNumber: vatId,
      registeredName: null,
      registeredAddress: null,
      error: "Ungültiges Format der USt-IdNr. Erwartet: Ländercode + Nummer (z.B. DE123456789)",
    };
  }

  try {
    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${parsed.countryCode}/vat/${parsed.number}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Try the alternative POST endpoint
      const postUrl = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
      const postResponse = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          countryCode: parsed.countryCode,
          vatNumber: parsed.number,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!postResponse.ok) {
        return {
          valid: false,
          countryCode: parsed.countryCode,
          vatNumber: parsed.number,
          registeredName: null,
          registeredAddress: null,
          error: `VIES-Dienst nicht erreichbar (HTTP ${postResponse.status})`,
        };
      }

      const data = await postResponse.json();
      return {
        valid: data.valid === true || data.isValid === true,
        countryCode: parsed.countryCode,
        vatNumber: parsed.number,
        registeredName: data.name || data.traderName || null,
        registeredAddress: data.address || data.traderAddress || null,
        error: null,
      };
    }

    const data = await response.json();

    return {
      valid: data.isValid === true || data.valid === true,
      countryCode: parsed.countryCode,
      vatNumber: parsed.number,
      registeredName: data.name || data.traderName || null,
      registeredAddress: data.address || data.traderAddress || null,
      error: data.userError && data.userError !== "VALID" ? data.userError : null,
    };
  } catch (err) {
    return {
      valid: false,
      countryCode: parsed.countryCode,
      vatNumber: parsed.number,
      registeredName: null,
      registeredAddress: null,
      error: err instanceof Error ? `VIES-Abfrage fehlgeschlagen: ${err.message}` : "VIES-Abfrage fehlgeschlagen",
    };
  }
}

export function buildCrossCheckPrompt(
  extractedData: Array<{ documentType: string; fields: Record<string, unknown> }>
): string {
  const dataJson = JSON.stringify(extractedData, null, 2);
  return `Führe eine dokumentübergreifende Konsistenzprüfung durch.

Folgende Daten wurden aus den einzelnen Dokumenten extrahiert:
${dataJson}

PRÜFE auf:
1. Firmenname: Ist der Name in allen Dokumenten identisch?
2. Adresse: Stimmt die Adresse in allen Dokumenten überein?
3. E-Mail-Domain: Passt die Domain zur Firmenwebsite?
4. Zeiträume: Überlappen sich Lizenz- und Versicherungszeiträume?
5. Muster: Wiederkehrende Tippfehler, ähnliche Formatfehler?

BEWERTE jeden Mismatch als critical/major/minor.

Antworte NUR mit einem JSON-Objekt:
{
  "consistencyScore": 0.0-1.0,
  "mismatches": [{ "field": "", "documents": [], "values": [], "severity": "", "description": "" }],
  "patterns": ["..."]
}`;
}

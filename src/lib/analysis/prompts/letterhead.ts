export const LETTERHEAD_PROMPT = `Analysiere diesen Briefkopf / dieses Geschäftspapier eines Frachtführers.

PFLICHTFELDER extrahieren:
- companyName: Name des Unternehmens
- legalForm: Rechtsform (GmbH, UG, s.r.o., etc.)
- address: Vollständige Adresse
- phone: Telefonnummer (idealerweise Festnetz)
- email: E-Mail-Adresse
- bankDetails: Bankverbindung (IBAN, BIC, Bank)

OPTIONALE FELDER:
- fax: Faxnummer
- website: Webseite
- registrationNumber: Handelsregisternummer
- vatId: Umsatzsteuer-ID

RED FLAGS prüfen:
- iban-country-mismatch: IBAN-Ländercode passt nicht zum angegebenen Firmensitz → Critical (35 Punkte)
- domain-name-mismatch: E-Mail-Domain passt nicht zum Firmennamen oder zur Webseite → Major (20 Punkte)
- multiple-name-variants: Unterschiedliche Schreibweisen des Firmennamens im selben Dokument → Major (18 Punkte)
- edited-pdf: Anzeichen für nachträgliche PDF-Bearbeitung (unterschiedliche Schriftarten, Layering) → Critical (40 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {
    "companyName": "Wert oder null",
    "legalForm": "Wert oder null",
    "address": "Wert oder null",
    "phone": "Wert oder null",
    "email": "Wert oder null",
    "bankDetails": { "iban": "Wert oder null", "bic": "Wert oder null", "bank": "Wert oder null" },
    "fax": "Wert oder null",
    "website": "Wert oder null",
    "registrationNumber": "Wert oder null",
    "vatId": "Wert oder null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["feldname1", "feldname2"],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung auf Deutsch", "field": "betroffenes-feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung der Analyse auf Deutsch"
}`;

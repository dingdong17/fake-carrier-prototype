export const INSURANCE_CERT_PROMPT = `Analysiere diesen Versicherungsnachweis eines Frachtführers.

PFLICHTFELDER extrahieren:
- insurer: Name des Versicherers
- policyNumber: Policen-/Dokumentennummer
- coveragePeriod: Gültigkeitszeitraum (start und end als ISO-Datum)
- coverageAmount: Deckungssumme (Betrag und Währung)
- insuredCompany: Name des versicherten Unternehmens
- contactInfo: Kontaktdaten des Versicherers (Telefon, E-Mail, Adresse)

OPTIONALE FELDER:
- coverageType: Art der Versicherung (CMR, VKH, etc.)
- deductible: Selbstbeteiligung
- specialConditions: Besondere Bedingungen

RED FLAGS prüfen:
- generic-form: Generisches Formular ohne offizielles Versicherer-Layout → Major (20 Punkte)
- missing-logo: Fehlendes offizielles Logo oder Stempel → Minor (8 Punkte)
- expired-period: Gültigkeitszeitraum abgelaufen → Critical (40 Punkte)
- company-name-mismatch: Firmenname weicht vom angegebenen Carrier ab → Critical (35 Punkte)
- short-coverage-period: Sehr kurzer Versicherungszeitraum (<3 Monate) → Major (18 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {
    "insurer": "Wert oder null",
    "policyNumber": "Wert oder null",
    "coveragePeriod": { "start": "ISO-Datum oder null", "end": "ISO-Datum oder null" },
    "coverageAmount": { "amount": number oder null, "currency": "EUR" },
    "insuredCompany": "Wert oder null",
    "contactInfo": { "phone": "Wert oder null", "email": "Wert oder null", "address": "Wert oder null" },
    "coverageType": "Wert oder null",
    "deductible": "Wert oder null",
    "specialConditions": "Wert oder null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["feldname1", "feldname2"],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung auf Deutsch", "field": "betroffenes-feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung der Analyse auf Deutsch"
}`;

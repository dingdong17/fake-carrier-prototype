export const INSURANCE_CERT_PROMPT = `Analysiere diesen Versicherungsnachweis / Versicherungsbestätigung / Versicherungsschein eines Frachtführers.

WICHTIG: Deutsche Versicherungsdokumente verwenden typischerweise folgende Überschriften und Abschnitte.
Suche gezielt nach diesen Bereichen im Dokument:

- "Versicherungsnehmer:" oder "Versicherungsnehmer" → Firmenname des versicherten Unternehmens
- "Mitversicherte:" oder "Mitversicherte Unternehmen" → Liste der mitversicherten Firmen
- "Laufzeit der Police:" oder "Beginn:" / "Ablauf:" → Versicherungszeitraum
- "Begrenzung der Versicherungsleistung" oder "Versicherungssumme" → Deckungssumme
- "Versicherer:" → Name der Versicherungsgesellschaft (oft am Ende des Dokuments mit Unterschrift)
- "Nr." oder "Police Nr." oder "Vertragsnummer" → Policennummer (oft in der Überschrift/Titel)
- "Fa." oder "Firma" sind Abkürzungen für Firmenname und sollen NICHT als Teil des Firmennamens extrahiert werden

PFLICHTFELDER extrahieren:
- insurer: Name des Versicherers / der Versicherungsgesellschaft (z.B. "Mannheimer Versicherung AG", "Allianz Versicherungs-AG")
- policyNumber: Policen-/Vertragsnummer (oft in der Titelzeile des Dokuments, z.B. "Nr. TH 224-7692922-6704094")
- coveragePeriod: Gültigkeitszeitraum mit Beginn und Ablauf als ISO-Datum (z.B. Beginn: 01.02.2021 → "2021-02-01")
- coverageAmount: Deckungssumme / Höchstentschädigung (Betrag und Währung, z.B. "5 Mio. Euro je Schadenereignis")
- insuredCompany: Name des Versicherungsnehmers / versicherten Unternehmens (OHNE "Firma" oder "Fa." Präfix)
- contactInfo: Kontaktdaten des Versicherers (Adresse, Telefon, E-Mail falls vorhanden)
- vatId: Umsatzsteuer-Identifikationsnummer (USt-IdNr.) des Versicherungsnehmers oder des Versicherers, falls im Dokument angegeben. Format z.B. "DE123456789". Suche auch nach "UID", "Steuernummer", "USt-ID", "VAT", "Umsatzsteuer-Identifikationsnummer"

OPTIONALE FELDER:
- coverageType: Art der Versicherung (z.B. "Verkehrshaftungsversicherung", "CMR", "F&S", "VKH")
- isVerkehrshaftung: true/false — Prüfe ob es sich um eine VERKEHRSHAFTUNGSVERSICHERUNG handelt.
  Erkennungsmerkmale (eines oder mehrere genügen):
  - Titel enthält "Verkehrshaftung" oder "verkehrsvertragliche Haftung"
  - Bezeichnung "F&S" (Frachtführer und Spediteure)
  - Bezeichnung "VKH" (Verkehrshaftung)
  - Bezeichnung "CMR-Versicherung" oder Bezug auf CMR-Übereinkommen
  - Bezeichnung "Frachtführerhaftpflicht" oder "Frachtführerhaftungsversicherung"
  - Bezeichnung "SVS" (Speditionsversicherungsschein) oder "RVS"
  - Bezug auf §§ 407 ff. HGB (Frachtrecht)
  - Bezug auf § 7a GüKG (Güterkraftverkehrsgesetz)
  - Formulierungen wie "verkehrsvertragliche Haftung des Versicherungsnehmers"
  - Bezug auf ADSp (Allgemeine Deutsche Spediteurbedingungen) oder VBGL
  Setze true wenn EINES dieser Merkmale gefunden wird.
- coInsuredCompanies: Liste der mitversicherten Unternehmen als Array von Strings. Suche unter "Mitversicherte:" und extrahiere jeden Firmennamen OHNE "Fa." oder "Firma" Präfix. Beispiel: "Fa. Sand-Körner GmbH" → "Sand-Körner GmbH"
- deductible: Selbstbeteiligung (falls angegeben)
- specialConditions: Besondere Bedingungen oder Ausschlüsse (Kurzfassung)
- geographicScope: Geltungsbereich (z.B. "Staaten Europas und der Türkei")
- qualifiedFaultLimit: Begrenzung bei qualifiziertem Verschulden (falls angegeben)

RED FLAGS prüfen:
- generic-form: Generisches Formular ohne offizielles Versicherer-Layout, fehlendes Logo → Major (20 Punkte)
- missing-logo: Fehlendes offizielles Logo oder Stempel des Versicherers → Minor (8 Punkte)
- expired-period: Gültigkeitszeitraum abgelaufen (Ablaufdatum liegt in der Vergangenheit) → Critical (40 Punkte)
- company-name-mismatch: Firmenname des Versicherungsnehmers weicht vom angegebenen Frachtführer ab → Critical (35 Punkte)
- short-coverage-period: Sehr kurzer Versicherungszeitraum (weniger als 3 Monate) → Major (18 Punkte)
- missing-signature: Keine Unterschrift des Versicherers erkennbar → Major (15 Punkte)
- low-coverage: Deckungssumme erscheint ungewöhnlich niedrig für gewerblichen Transport → Minor (10 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {
    "insurer": "Name der Versicherungsgesellschaft oder null",
    "policyNumber": "Policennummer oder null",
    "coveragePeriod": { "start": "YYYY-MM-DD oder null", "end": "YYYY-MM-DD oder null" },
    "coverageAmount": { "amount": 5000000, "currency": "EUR", "description": "z.B. 5 Mio. Euro je Schadenereignis" },
    "insuredCompany": "Firmenname ohne Fa./Firma Präfix oder null",
    "contactInfo": { "phone": "Telefon oder null", "email": "E-Mail oder null", "address": "Adresse oder null" },
    "vatId": "USt-IdNr. oder null",
    "coverageType": "Art der Versicherung oder null",
    "isVerkehrshaftung": true,
    "coInsuredCompanies": ["Firmenname 1 ohne Fa.", "Firmenname 2 ohne Fa."],
    "deductible": "Selbstbeteiligung oder null",
    "specialConditions": "Kurze Zusammenfassung besonderer Bedingungen oder null",
    "geographicScope": "Geltungsbereich oder null",
    "qualifiedFaultLimit": "Begrenzung bei qualifiziertem Verschulden oder null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["feldname1", "feldname2"],
  "riskSignals": [
    {
      "severity": "critical|major|minor",
      "rule": "rule-id",
      "description": "Beschreibung auf Deutsch mit Bezug zur Textstelle im Dokument",
      "field": "betroffenes-feld",
      "points": 0
    }
  ],
  "summary": "Kurze Zusammenfassung der Analyse auf Deutsch"
}`;

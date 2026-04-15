export const FREIGHT_PROFILE_PROMPT = `Analysiere dieses Frachtenbörsen-Profil (z.B. TIMOCOM, Trans.eu) eines Frachtführers.

PFLICHTFELDER extrahieren:
- memberSince: Mitglied seit (Datum)
- address: Adresse des Unternehmens
- contact: Kontaktdaten (Telefon, E-Mail, Ansprechpartner)
- legalForm: Rechtsform des Unternehmens

OPTIONALE FELDER:
- activityDescription: Tätigkeitsbeschreibung / Leistungsspektrum
- references: Referenzen oder Bewertungen anderer Mitglieder
- rating: Bewertung / Rating auf der Plattform

RED FLAGS prüfen:
- very-new-member: Sehr neues Mitglied, weniger als 6 Monate aktiv → Major (18 Punkte)
- mobile-only: Nur Mobilnummer als Kontakt, keine Festnetznummer → Major (15 Punkte)
- freemail-domain: Freemail-Adresse statt Firmen-Domain (gmail.com, yahoo.com, etc.) → Major (15 Punkte)
- coworking-address: Adresse ist ein bekannter Coworking-Space oder virtuelles Büro → Minor (10 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {
    "memberSince": "Wert oder null",
    "address": "Wert oder null",
    "contact": { "phone": "Wert oder null", "email": "Wert oder null", "person": "Wert oder null" },
    "legalForm": "Wert oder null",
    "activityDescription": "Wert oder null",
    "references": "Wert oder null",
    "rating": "Wert oder null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["feldname1", "feldname2"],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung auf Deutsch", "field": "betroffenes-feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung der Analyse auf Deutsch"
}`;

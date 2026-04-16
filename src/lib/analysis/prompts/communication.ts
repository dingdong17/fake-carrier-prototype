export const COMMUNICATION_PROMPT = `Analysiere diese E-Mail-Korrespondenz / Kommunikation mit einem Frachtführer.

PFLICHTFELDER extrahieren:
- senderEmail: E-Mail-Adresse des Absenders
- contactPerson: Name des Ansprechpartners

OPTIONALE FELDER:
- emailDomain: Domain der E-Mail-Adresse
- communicationChannel: Kommunikationskanal (E-Mail, WhatsApp, Telefon, etc.)
- timestamps: Zeitstempel der Kommunikation

RED FLAGS prüfen:
- freemail-address: Freemail-Adresse statt Firmen-Domain (gmail.com, yahoo.com, web.de, etc.) → Major (15 Punkte)
- domain-mismatch: E-Mail-Domain passt nicht zum angegebenen Unternehmen → Major (20 Punkte)
- unusual-hours: Kommunikation zu ungewöhnlichen Uhrzeiten (nachts, Wochenende) → Minor (8 Punkte)
- changing-contacts: Wechselnde Ansprechpartner ohne klare Rollenverteilung → Minor (10 Punkte)
- spelling-patterns: Auffällige Rechtschreibmuster oder ungewöhnliche Formulierungen → Minor (8 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {
    "senderEmail": "Wert oder null",
    "contactPerson": "Wert oder null",
    "emailDomain": "Wert oder null",
    "communicationChannel": "Wert oder null",
    "timestamps": "Wert oder null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["feldname1", "feldname2"],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung auf Deutsch", "field": "betroffenes-feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung der Analyse auf Deutsch"
}`;

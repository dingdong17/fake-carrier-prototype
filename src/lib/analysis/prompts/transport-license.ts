export const TRANSPORT_LICENSE_PROMPT = `Analysiere diese EU-Transportlizenz / Gemeinschaftslizenz eines Frachtführers.

PFLICHTFELDER extrahieren:
- licenseNumber: Lizenznummer
- authority: Ausstellende Behörde
- validityPeriod: Gültigkeitszeitraum (start und end als ISO-Datum)
- companyName: Name des Unternehmens
- companyAddress: Adresse des Unternehmens

OPTIONALE FELDER:
- vehicleCount: Anzahl der zugelassenen Fahrzeuge
- trafficManager: Verkehrsleiter (Name und Qualifikation)

RED FLAGS prüfen:
- fresh-license: Sehr frische Lizenz, weniger als 3 Monate alt → Major (20 Punkte)
- wrong-authority: Ausstellende Behörde passt nicht zum Land/Region → Critical (35 Punkte)
- address-mismatch: Adresse weicht von anderen Dokumenten ab → Critical (40 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {
    "licenseNumber": "Wert oder null",
    "authority": "Wert oder null",
    "validityPeriod": { "start": "ISO-Datum oder null", "end": "ISO-Datum oder null" },
    "companyName": "Wert oder null",
    "companyAddress": "Wert oder null",
    "vehicleCount": "Wert oder null",
    "trafficManager": "Wert oder null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["feldname1", "feldname2"],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung auf Deutsch", "field": "betroffenes-feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung der Analyse auf Deutsch"
}`;

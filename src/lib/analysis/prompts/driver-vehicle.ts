export const DRIVER_VEHICLE_PROMPT = `Analysiere diese Fahrer- und Fahrzeugdaten eines Frachtführers.

PFLICHTFELDER extrahieren:
- driverName: Name des Fahrers
- driverId: Ausweis- oder Führerscheinnummer des Fahrers
- licensePlate: Kennzeichen des Fahrzeugs
- vehicleType: Fahrzeugtyp (LKW, Sattelzug, Transporter, etc.)

OPTIONALE FELDER:
- vin: Fahrzeug-Identifizierungsnummer (FIN/VIN)
- driverLicense: Führerscheinklasse und Gültigkeitsdatum
- vehiclePhotos: Beschreibung vorhandener Fahrzeugfotos
- vehiclePapers: Fahrzeugschein / Zulassungsbescheinigung

RED FLAGS prüfen:
- plate-country-mismatch: Kennzeichen-Ländercode passt nicht zum angegebenen Firmensitz → Major (20 Punkte)
- document-manipulation: Anzeichen für manipulierte Dokumente (unterschiedliche Schriftarten, Bildbearbeitung) → Critical (45 Punkte)
- vehicle-type-mismatch: Fahrzeugtyp passt nicht zur angebotenen Transportleistung → Minor (10 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {
    "driverName": "Wert oder null",
    "driverId": "Wert oder null",
    "licensePlate": "Wert oder null",
    "vehicleType": "Wert oder null",
    "vin": "Wert oder null",
    "driverLicense": "Wert oder null",
    "vehiclePhotos": "Wert oder null",
    "vehiclePapers": "Wert oder null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["feldname1", "feldname2"],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung auf Deutsch", "field": "betroffenes-feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung der Analyse auf Deutsch"
}`;

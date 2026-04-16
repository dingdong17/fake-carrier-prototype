export const CLASSIFY_PROMPT = `Analysiere das hochgeladene Dokument und bestimme den Dokumenttyp.

Mögliche Typen:
- "insurance-cert": Versicherungsnachweis / Versicherungsbestätigung / CMR-Police
- "transport-license": EU-Transportlizenz / Gemeinschaftslizenz / Güterkraftverkehrslizenz
- "letterhead": Briefkopf / Firmenpapier / Geschäftspapier mit Unternehmensdaten
- "freight-profile": Frachtenbörsen-Profil (z.B. TIMOCOM, Trans.eu)
- "communication": E-Mail-Korrespondenz / Chat-Verläufe
- "driver-vehicle": Fahrerdokumente / Fahrzeugpapiere / Kennzeichen
- "unknown": Nicht zuordbar

Antworte NUR mit einem JSON-Objekt:
{
  "documentType": "der-typ-id",
  "confidence": 0.0-1.0,
  "reasoning": "Kurze Begründung auf Deutsch"
}`;

/**
 * Document-type-specific terminal messages for the AI terminal.
 * Each document type has messages for: upload, classification, extraction phases.
 */

interface PhaseMessages {
  classifying: string[];
  identified: string;
  extracting: string[];
  extracted: string;
}

const MESSAGES: Record<string, PhaseMessages> = {
  "insurance-cert": {
    classifying: [
      "Prüfe Dokumentenstruktur...",
      "Suche nach Versicherungs-Kennzeichen...",
      "Analysiere Briefkopf und Logo...",
    ],
    identified: "Versicherungsnachweis / Versicherungsbestätigung identifiziert",
    extracting: [
      "Suche Versicherungsnehmer...",
      "Extrahiere Policennummer und Deckungssumme...",
      "Prüfe Gültigkeitszeitraum...",
      "Suche nach Mitversicherten...",
      "Prüfe auf Verkehrshaftungsversicherung (VKH/CMR/F&S)...",
      "Analysiere Ausschlüsse und Bedingungen...",
      "Suche USt-IdNr. des Versicherungsnehmers...",
    ],
    extracted: "Versicherungsdaten vollständig extrahiert",
  },
  "transport-license": {
    classifying: [
      "Prüfe Dokumentenstruktur...",
      "Suche nach EU-Lizenz-Merkmalen...",
      "Analysiere Behördenstempel und Format...",
    ],
    identified: "EU-Transportlizenz / Gemeinschaftslizenz identifiziert",
    extracting: [
      "Extrahiere Lizenznummer...",
      "Prüfe ausstellende Behörde...",
      "Lese Gültigkeitszeitraum...",
      "Prüfe Fahrzeuganzahl und Verkehrsleiter...",
      "Vergleiche Unternehmensangaben...",
    ],
    extracted: "Lizenzdaten vollständig extrahiert",
  },
  letterhead: {
    classifying: [
      "Prüfe Dokumentenstruktur...",
      "Analysiere Briefkopf-Layout...",
      "Suche nach Unternehmensangaben...",
    ],
    identified: "Briefkopf / Geschäftspapier identifiziert",
    extracting: [
      "Extrahiere Firmenname und Rechtsform...",
      "Lese Adresse und Kontaktdaten...",
      "Prüfe Bankverbindung und IBAN...",
      "Suche Handelsregister- und USt-IdNr....",
      "Analysiere E-Mail-Domain...",
    ],
    extracted: "Unternehmensdaten vollständig extrahiert",
  },
  "freight-profile": {
    classifying: [
      "Prüfe Dokumentenstruktur...",
      "Suche nach Frachtenbörsen-Merkmalen...",
      "Analysiere Profil-Layout (TIMOCOM, Trans.eu)...",
    ],
    identified: "Frachtenbörsen-Profil identifiziert",
    extracting: [
      "Extrahiere Mitgliedschaftsdaten...",
      "Prüfe Kontaktinformationen...",
      "Lese Tätigkeitsbeschreibung...",
      "Prüfe auf Freemail-Adressen und Mobilnummern...",
    ],
    extracted: "Profildaten vollständig extrahiert",
  },
  communication: {
    classifying: [
      "Prüfe Dokumentenstruktur...",
      "Suche nach E-Mail-Headern oder Chat-Verlauf...",
      "Analysiere Kommunikationsformat...",
    ],
    identified: "E-Mail-Korrespondenz / Kommunikation identifiziert",
    extracting: [
      "Extrahiere Absender und Empfänger...",
      "Prüfe E-Mail-Domains...",
      "Analysiere Kommunikationszeitpunkte...",
      "Suche nach Ansprechpartnern...",
      "Prüfe auf verdächtige Muster...",
    ],
    extracted: "Kommunikationsdaten extrahiert",
  },
  "driver-vehicle": {
    classifying: [
      "Prüfe Dokumentenstruktur...",
      "Suche nach Fahrzeug- oder Fahrerdaten...",
      "Analysiere Dokumentenformat (Ausweis, Schein, Papiere)...",
    ],
    identified: "Fahrer- & Fahrzeugdaten identifiziert",
    extracting: [
      "Extrahiere Fahrername und Ausweisnummer...",
      "Lese Fahrzeugkennzeichen...",
      "Prüfe Fahrzeugtyp und VIN...",
      "Vergleiche Herkunftsland mit Kennzeichen...",
    ],
    extracted: "Fahrer- und Fahrzeugdaten extrahiert",
  },
  unknown: {
    classifying: [
      "Prüfe Dokumentenstruktur...",
      "Versuche Dokumenttyp zu bestimmen...",
      "Analysiere Inhalt und Format...",
    ],
    identified: "Dokumenttyp konnte nicht eindeutig bestimmt werden",
    extracting: [
      "Versuche relevante Daten zu extrahieren...",
    ],
    extracted: "Verfügbare Daten extrahiert",
  },
};

/**
 * Get phase-appropriate messages for a document type.
 * Returns a random message from the phase's message pool.
 */
export function getClassifyingMessage(documentType?: string): string {
  const msgs = MESSAGES[documentType || "unknown"]?.classifying || MESSAGES.unknown.classifying;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function getIdentifiedMessage(documentType: string): string {
  return MESSAGES[documentType]?.identified || MESSAGES.unknown.identified;
}

export function getExtractingMessages(documentType: string): string[] {
  return MESSAGES[documentType]?.extracting || MESSAGES.unknown.extracting;
}

export function getExtractedMessage(documentType: string): string {
  return MESSAGES[documentType]?.extracted || MESSAGES.unknown.extracted;
}

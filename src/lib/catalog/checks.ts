export type CheckCategory =
  | "document-classification"
  | "document-extraction"
  | "external-registry"
  | "forensic"
  | "osint"
  | "cross-check";

export type Tier = "quick" | "medium" | "full";

export interface ScoreEffect {
  delta: number;
  note?: string;
}

export interface ScoreImpact {
  passed: ScoreEffect;
  failed: ScoreEffect;
  skipped: ScoreEffect;
}

export interface CheckDefinition {
  id: string;
  name: string;
  category: CheckCategory;
  description: string;
  source: string;
  availability: Tier;
  scoreImpact: ScoreImpact;
}

export const CHECK_CATALOG: CheckDefinition[] = [
  // ---------- Forensic: image ----------
  {
    id: "image-editing-software",
    name: "Bildbearbeitungssoftware im EXIF",
    category: "forensic",
    availability: "quick",
    source: "exifr (lokal, ohne externe API)",
    description:
      "Die EXIF-Metadaten jedes hochgeladenen Bildes werden gelesen und das „Software“-Feld gegen eine Liste bekannter Bildbearbeitungsprogramme (Photoshop, Lightroom, GIMP, Pixelmator, Affinity Photo, Paint.NET) geprüft. Eine Marketingaufnahme, die mit Photoshop optimiert wurde, ist nicht automatisch Betrug — aber ein „Fahrerfoto am LKW“, das aus Photoshop stammt, ist ein klares Warnzeichen. Die Prüfung liefert nur ein Indiz; die finale Bewertung macht der Makler.",
    scoreImpact: {
      passed: { delta: 0, note: "Keine Bearbeitungsspuren im EXIF" },
      failed: { delta: 30, note: "major" },
      skipped: { delta: 0, note: "Vertrauen -5%" },
    },
  },
  {
    id: "image-no-metadata",
    name: "Fehlende EXIF-Metadaten im Bild",
    category: "forensic",
    availability: "quick",
    source: "exifr (lokal)",
    description:
      "Prüft, ob das Bild überhaupt EXIF-Metadaten enthält (Kameramodell, Aufnahmedatum, GPS, Software-Stempel). Wurden alle Metadaten entfernt, fehlt eine wesentliche Spur der Bildherkunft — oft ein Nebeneffekt von Re-Uploads über Messaging-Dienste, manchmal aber auch ein bewusster Versuch, Herkunft zu verschleiern. Als alleiniges Signal schwach, in Kombination mit anderen Indizien stark.",
    scoreImpact: {
      passed: { delta: 0, note: "EXIF vorhanden" },
      failed: { delta: 15, note: "minor" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "image-date-inconsistency",
    name: "Inkonsistenz zwischen Aufnahme- und Änderungsdatum",
    category: "forensic",
    availability: "quick",
    source: "exifr (lokal)",
    description:
      "Vergleicht `DateTimeOriginal` mit `ModifyDate` aus dem EXIF. Liegen diese mehr als 24 Stunden auseinander, wurde das Bild nachträglich bearbeitet — mindestens beschnitten oder rotiert, im schlimmsten Fall inhaltlich manipuliert. Low-Severity, weil legitime Ursachen (Export, Drehen, Beschriften) häufig sind, aber auffällig in Kombination mit einem Editing-Software-Stempel.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 10, note: "minor" },
      skipped: { delta: 0 },
    },
  },

  // ---------- Forensic: PDF ----------
  {
    id: "pdf-online-editor",
    name: "PDF aus Online-Editor",
    category: "forensic",
    availability: "quick",
    source: "pdf-parse (lokal)",
    description:
      "Liest `/Producer` und `/Creator` aus den PDF-Metadaten und gleicht gegen bekannte Online-PDF-Editoren ab (iLovePDF, Smallpdf, Sejda, PDFescape, Soda PDF, online2pdf, PDF24). Wurde ein legitimes Versicherungszertifikat von Allianz durch iLovePDF geschickt, ist das sehr auffällig — normale Versicherer exportieren direkt aus Word/InDesign. Die Erkennung ist deterministisch und liefert sehr wenige Falsch-Positive.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 30, note: "major" },
      skipped: { delta: 0, note: "Vertrauen -5%" },
    },
  },
  {
    id: "pdf-incremental-updates",
    name: "PDF nach Erstellung bearbeitet",
    category: "forensic",
    availability: "quick",
    source: "pdf-parse + Regex über Rohpuffer",
    description:
      "Zählt `/Prev`-Einträge in den XREF-Tabellen des PDFs. Jeder Eintrag entspricht einer inkrementellen Revision: das Dokument wurde nach dem ersten Speichern erneut geöffnet und verändert (z.B. Felder ausgefüllt, Texte ersetzt, Unterschriften eingefügt). Das muss nicht Betrug sein — aber ein „unverändertes Original vom Versicherer“ mit 3 inkrementellen Updates ist ein rotes Tuch.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 25, note: "major" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "pdf-embedded-javascript",
    name: "Eingebettetes JavaScript im PDF",
    category: "forensic",
    availability: "quick",
    source: "Regex über Rohpuffer",
    description:
      "Sucht nach `/JS`, `/JavaScript` und `/OpenAction` im PDF-Rohinhalt. Legitime Transportunterlagen enthalten nie ausführbaren Code. Eingebettetes JavaScript kann für Phishing, Credential-Harvesting oder Exploit-Versuche genutzt werden und ist ein kritisches Warnsignal — sowohl aus Betrugs- als auch aus IT-Sicherheitsperspektive.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 45, note: "critical" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "pdf-no-metadata",
    name: "Fehlende PDF-Metadaten",
    category: "forensic",
    availability: "quick",
    source: "pdf-parse",
    description:
      "Prüft, ob das PDF Grundmetadaten (`/Producer`, `/Creator`, `/Author` oder `/Title`) enthält. Fehlen alle, wurden die Metadaten aktiv entfernt — das ist im Alltag selten, weil jede übliche PDF-Erzeugung zumindest ein Produzenten-Feld hinterlässt. Auffällig, aber für sich allein kein Beweis; niedrig gewichtet.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 15, note: "minor" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "pdf-date-inconsistency",
    name: "Inkonsistente PDF-Zeitstempel",
    category: "forensic",
    availability: "quick",
    source: "pdf-parse",
    description:
      "Vergleicht `CreationDate` und `ModDate` aus dem PDF. Liegt das Änderungsdatum vor dem Erstellungsdatum oder mehr als 5 Jahre danach, ist die Chronologie unplausibel — typisch, wenn ein altes Dokument aufgebohrt oder ein Template zeitlich rückdatiert wurde. Schwaches Signal für sich, in Kombination mit Incremental-Updates und Online-Editor-Marker aber stark.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 10, note: "minor" },
      skipped: { delta: 0 },
    },
  },

  // ---------- External registry ----------
  {
    id: "vies-validation",
    name: "VIES USt-IdNr.-Validierung",
    category: "external-registry",
    availability: "quick",
    source: "Europäische Kommission VIES REST-API (kostenlos, ohne Registrierung)",
    description:
      "Die USt-IdNr. des Frachtführers wird gegen die offizielle VIES-Datenbank der EU-Kommission geprüft. VIES liefert neben Gültigkeit auch den registrierten Firmennamen und die Adresse zurück. Stimmt der VIES-Name nicht mit dem Namen auf den Dokumenten überein, ist das ein sehr starkes Warnzeichen — entweder Tippfehler im Dokument oder eine geliehene/gefälschte USt-ID.",
    scoreImpact: {
      passed: { delta: 0, note: "Gültig & Name passt" },
      failed: { delta: 40, note: "critical bei Name-Mismatch, major bei ungültig" },
      skipped: { delta: 0, note: "Vertrauen -10%" },
    },
  },
  {
    id: "domain-age-check",
    name: "Domain-Altersprüfung (RDAP)",
    category: "external-registry",
    availability: "quick",
    source: "Offizielle RDAP-Endpunkte der Registries",
    description:
      "Das Registrierungsdatum der Firmendomain wird über RDAP (Registration Data Access Protocol) abgefragt. Domains jünger als 90 Tage, die für eine angeblich etablierte Transportfirma genutzt werden, sind ein bekanntes Muster bei Phantomfrachtführern — der Täter kauft eine Domain, fälscht Papiere und verschwindet nach einem Auftrag. Ältere Domains sind kein Freibrief, reduzieren aber das Risiko deutlich.",
    scoreImpact: {
      passed: { delta: 0, note: "Domain älter als 1 Jahr" },
      failed: { delta: 25, note: "major bei <90 Tagen, minor bei <1 Jahr" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "email-sanity",
    name: "E-Mail-Plausibilitätsprüfung",
    category: "external-registry",
    availability: "quick",
    source: "MX-Record-Lookup + Freemail-Blocklist",
    description:
      "Prüft, ob die Absenderdomain gültige MX-Records hat (E-Mail überhaupt empfängt) und ob es sich um eine Freemail-Adresse (gmail.com, gmx.de, web.de) oder eine Firmenadresse handelt. Ein „offizieller Frachtführer“, der Aufträge über eine gmail-Adresse abwickelt, ist ein klassisches Red-Flag-Muster.",
    scoreImpact: {
      passed: { delta: 0, note: "Firmendomain mit MX" },
      failed: { delta: 15, note: "minor bei Freemail, major bei fehlenden MX" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "website-existence",
    name: "Firmen-Webpräsenz",
    category: "external-registry",
    availability: "quick",
    source: "HEAD-Request + optionale KI-Suche nach offizieller Seite",
    description:
      "Prüft, ob die angegebene Firmen-Website erreichbar ist und (optional) ob sie inhaltlich zur Firma passt. Ein fehlender Webauftritt ist für einen aktiven europäischen Frachtführer im Jahr 2026 ungewöhnlich — nicht disqualifizierend, aber erklärungsbedürftig. Kombiniert mit junger Domain und Mobilfunk-only-Kontakt wird das Signal stark.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 10, note: "minor" },
      skipped: { delta: 0 },
    },
  },

  // ---------- Document classification / extraction (Claude vision) ----------
  {
    id: "document-classify",
    name: "Automatische Dokumenttyp-Erkennung",
    category: "document-classification",
    availability: "quick",
    source: "Claude Sonnet (KI-Klassifikator)",
    description:
      "Jedes hochgeladene Dokument wird automatisch einem Typ zugeordnet (Versicherungsnachweis, Transportlizenz, Firmen-Briefkopf, TIMOCOM-Profil, Kommunikation, Fahrer/Fahrzeugdokument). Die Klassifikation bestimmt, welcher spezialisierte Extraktions-Prompt anschließend läuft. Ohne korrekte Klassifikation greifen die typ-spezifischen Red-Flag-Regeln nicht.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 0, note: "Typ unbekannt — nachfolgende Prüfungen entfallen" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "expired-period",
    name: "Versicherungszeitraum abgelaufen",
    category: "document-extraction",
    availability: "medium",
    source: "Claude Sonnet Vision-Extraktion",
    description:
      "Prüft den Gültigkeitszeitraum aus dem Versicherungsnachweis gegen das aktuelle Datum. Eine abgelaufene Verkehrshaftungsversicherung bedeutet vollen Haftungsausfall im Schadensfall — ein Showstopper, unabhängig von allen anderen Signalen.",
    scoreImpact: {
      passed: { delta: 0, note: "Police aktiv" },
      failed: { delta: 40, note: "critical" },
      skipped: { delta: 0, note: "Vertrauen -15%" },
    },
  },
  {
    id: "company-name-mismatch",
    name: "Firmenname im Dokument weicht vom Frachtführer ab",
    category: "document-extraction",
    availability: "medium",
    source: "Claude Sonnet + Name-Normalisierung",
    description:
      "Der im Versicherungsnachweis genannte Versicherungsnehmer wird mit dem angegebenen Frachtführernamen verglichen. Mismatches sind hochverdächtig — entweder ist die Police für eine andere Firma ausgestellt (= kein Schutz), oder das Dokument wurde von einer legitimen Firma „ausgeliehen“. Normalisiert Rechtsformen (GmbH, sp. z o.o., s.r.o.) und Schreibvarianten.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 35, note: "critical" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "document-manipulation",
    name: "Sichtbare Dokumentmanipulation",
    category: "document-extraction",
    availability: "medium",
    source: "Claude Sonnet Vision",
    description:
      "Die KI prüft visuell auf Manipulationsspuren: unterschiedliche Schriftarten innerhalb desselben Feldes, sichtbare Bildbearbeitungsspuren um Namen/Zahlen/Unterschriften, inkonsistente Ausrichtung, überlagerte Text­blöcke. Ergänzt die forensischen Metadaten-Checks um eine Inhaltsebene.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 45, note: "critical" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "plate-country-mismatch",
    name: "Kennzeichen passt nicht zum Firmenland",
    category: "document-extraction",
    availability: "medium",
    source: "Claude Sonnet Vision + Länder-Präfix-Tabelle",
    description:
      "Ein polnischer Frachtführer mit ausschließlich rumänischen Kennzeichen ist nicht per se Betrug, aber erklärungsbedürftig — oft ein Indiz für Scheinfahrzeuge oder Subunternehmer­ketten. Kombiniert mit fehlender Fahrzeugzahl im Transportlizenz-Register wird das Signal stark.",
    scoreImpact: {
      passed: { delta: 0 },
      failed: { delta: 20, note: "major" },
      skipped: { delta: 0 },
    },
  },
  {
    id: "cross-document-consistency",
    name: "Dokumentübergreifende Konsistenzprüfung",
    category: "cross-check",
    availability: "full",
    source: "Claude Sonnet (Cross-Check-Prompt)",
    description:
      "Nach der Einzelextraktion gleicht die KI die Felder über alle hochgeladenen Dokumente ab: stimmt der Firmenname auf Briefkopf, Police, Lizenz und Kommunikation überein? Passen Adressen, IBAN, USt-IdNr.? Unstimmigkeiten werden mit Severity (critical/major/minor) markiert. Dies ist die wichtigste Abwehr gegen „Mischdokumente“ aus mehreren Quellen.",
    scoreImpact: {
      passed: { delta: 0, note: "Alle Felder konsistent" },
      failed: { delta: 30, note: "pro critical mismatch" },
      skipped: { delta: 0, note: "Nur bei mehreren Dokumenten relevant" },
    },
  },
];

export function getCheckById(id: string): CheckDefinition | undefined {
  return CHECK_CATALOG.find((c) => c.id === id);
}

export function getChecksByCategory(
  category: CheckCategory
): CheckDefinition[] {
  return CHECK_CATALOG.filter((c) => c.category === category);
}

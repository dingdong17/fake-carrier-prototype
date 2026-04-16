"use client";

import { useEffect, useRef, useState } from "react";

interface AiTerminalProps {
  lines: string[];
  isActive: boolean;
}

const THINKING_MESSAGES = [
  "Dokumentstruktur wird analysiert...",
  "Textextraktion läuft...",
  "Pflichtfelder werden identifiziert...",
  "Prüfe Dokumentenlayout auf Auffälligkeiten...",
  "Vergleiche mit bekannten Versicherungsformularen...",
  "Extrahiere Versicherungsnehmer-Daten...",
  "Prüfe Gültigkeitszeitraum...",
  "Analysiere Deckungssummen...",
  "Suche nach Mitversicherten...",
  "Prüfe Unterschriften und Stempel...",
  "Validiere Formatierung und Layout...",
  "Extrahiere Kontaktdaten...",
  "Prüfe auf Red Flags...",
  "Querprüfung der extrahierten Felder...",
  "Bewerte Dokumenten-Authentizität...",
  "Analysiere Schriftarten und Formatierung...",
  "Suche nach USt-IdNr...",
  "Prüfe Policennummer...",
  "Identifiziere Versicherungstyp...",
  "Analysiere Vertragsbedingungen...",
  "Prüfe Deckungsumfang...",
  "Extrahiere geographischen Geltungsbereich...",
  "Suche nach Ausschlüssen...",
  "Validiere Datumsangaben...",
  "Prüfe Konsistenz der Firmenangaben...",
  "Analysiere Briefkopf-Merkmale...",
  "Klassifiziere Dokumententyp...",
  "Verifiziere Behördenangaben...",
  "Prüfe IBAN-Plausibilität...",
  "Analysiere E-Mail-Domains...",
];

function useThinkingLine(isActive: boolean) {
  const [thinkingLine, setThinkingLine] = useState("");
  const usedIndices = useRef(new Set<number>());

  useEffect(() => {
    if (!isActive) {
      setThinkingLine("");
      usedIndices.current.clear();
      return;
    }

    function pickRandom() {
      if (usedIndices.current.size >= THINKING_MESSAGES.length) {
        usedIndices.current.clear();
      }
      let idx: number;
      do {
        idx = Math.floor(Math.random() * THINKING_MESSAGES.length);
      } while (usedIndices.current.has(idx));
      usedIndices.current.add(idx);
      return THINKING_MESSAGES[idx];
    }

    setThinkingLine(pickRandom());

    const interval = setInterval(() => {
      setThinkingLine(pickRandom());
    }, 2000 + Math.random() * 2000); // 2-4 seconds

    return () => clearInterval(interval);
  }, [isActive]);

  return thinkingLine;
}

export function AiTerminal({ lines, isActive }: AiTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const thinkingLine = useThinkingLine(isActive);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, thinkingLine]);

  if (lines.length === 0 && !isActive) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-ec-dark-green/30 bg-[#0a0f0a] font-mono text-sm shadow-lg">
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-ec-dark-green/20 bg-[#0d120d] px-4 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 text-xs text-[#4ade80]/60">
          ai-agent — Frachtführer-Prüfung
        </span>
        {isActive && (
          <span className="ml-auto inline-block h-2 w-2 animate-pulse rounded-full bg-[#4ade80]" />
        )}
      </div>

      {/* Terminal body */}
      <div className="max-h-72 overflow-y-auto px-4 py-3">
        {lines.map((line, i) => {
          const prefix = getPrefix(line);
          const color = getColor(line);

          return (
            <div
              key={i}
              className="flex items-start gap-2 py-0.5 opacity-80"
            >
              <span className="shrink-0 select-none text-[#4ade80]/40">
                {prefix}
              </span>
              <span className={color}>{line}</span>
            </div>
          );
        })}

        {/* Active thinking line — rotates every 2-4 seconds */}
        {isActive && thinkingLine && (
          <div className="flex items-start gap-2 py-0.5">
            <span className="shrink-0 select-none text-[#4ade80]/40">
              {">>"}
            </span>
            <span className="text-[#4ade80]/50">
              {thinkingLine}
              <span className="ml-0.5 inline-block h-4 w-1.5 bg-[#4ade80] animate-[blink_1s_step-end_infinite]" />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function getPrefix(line: string): string {
  if (line.startsWith("WARNUNG")) return "!!";
  if (line.includes("fehlgeschlagen") || line.includes("Fehler")) return "XX";
  if (line.includes("...") && !line.includes("bestätigt") && !line.includes("erkannt") && !line.includes("gültig") && !line.includes("gefunden")) return ">>";
  return "OK";
}

function getColor(line: string): string {
  if (line.startsWith("WARNUNG")) return "text-[#fbbf24]";
  if (line.includes("fehlgeschlagen") || line.includes("Fehler") || line.includes("Nicht gültig")) return "text-[#f87171]";
  if (line.includes("bestätigt") || line.includes("gültig") || line.includes("gefunden") || line.includes("erkannt") || line.includes("extrahiert")) return "text-[#4ade80]";
  if (line.includes("...")) return "text-[#4ade80]/70";
  return "text-[#4ade80]/80";
}

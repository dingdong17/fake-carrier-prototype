"use client";

import { useEffect, useRef } from "react";

interface AiTerminalProps {
  lines: string[];
  isActive: boolean;
}

export function AiTerminal({ lines, isActive }: AiTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

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
      <div className="max-h-64 overflow-y-auto px-4 py-3">
        {lines.map((line, i) => {
          const isLatest = i === lines.length - 1 && isActive;
          const prefix = getPrefix(line);
          const color = getColor(line);

          return (
            <div
              key={i}
              className={`flex items-start gap-2 py-0.5 transition-opacity ${
                isLatest ? "opacity-100" : "opacity-80"
              }`}
            >
              <span className="shrink-0 select-none text-[#4ade80]/40">
                {prefix}
              </span>
              <span className={color}>
                {line}
                {isLatest && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-[#4ade80]" />
                )}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function getPrefix(line: string): string {
  if (line.startsWith("WARNUNG")) return "!!";
  if (line.includes("fehlgeschlagen") || line.includes("Fehler")) return "XX";
  if (line.includes("...")) return ">>";
  return "OK";
}

function getColor(line: string): string {
  if (line.startsWith("WARNUNG")) return "text-[#fbbf24]";
  if (line.includes("fehlgeschlagen") || line.includes("Fehler")) return "text-[#f87171]";
  if (line.includes("...") && !line.includes("bestätigt") && !line.includes("erkannt")) return "text-[#4ade80]/70";
  if (line.includes("bestätigt") || line.includes("gültig") || line.includes("gefunden") || line.includes("erkannt")) return "text-[#4ade80]";
  return "text-[#4ade80]/80";
}

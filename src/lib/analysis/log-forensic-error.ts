import { sanitizeErrorMessage } from "@/lib/errors/sanitize";

export function logForensicError(context: string, error: unknown): void {
  const raw =
    error instanceof Error
      ? error.message
      : error === null || error === undefined
        ? ""
        : String(error);
  const safe = sanitizeErrorMessage(raw);
  console.error(
    `[FORENSIC_ERROR] ${context}: ${safe.code} — ${safe.message}`
  );
}

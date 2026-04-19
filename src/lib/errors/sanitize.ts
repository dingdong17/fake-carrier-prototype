export type ErrorCode =
  | "missing_credentials"
  | "rate_limited"
  | "timeout"
  | "network"
  | "file_too_large"
  | "unsupported_format"
  | "unknown";

export interface SafeError {
  code: ErrorCode;
  message: string;
}

const MAX_MESSAGE_LENGTH = 300;

function stripSecrets(msg: string): string {
  return msg
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{10,}/gi, "Bearer [redacted]")
    .replace(/\/Users\/[^\s)"']+/g, "[path]")
    .replace(/\/home\/[^\s)"']+/g, "[path]")
    .replace(/C:\\[^\s)"']+/g, "[path]")
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, "[hash]");
}

function truncate(msg: string): string {
  return msg.length > MAX_MESSAGE_LENGTH
    ? msg.slice(0, MAX_MESSAGE_LENGTH) + "…"
    : msg;
}

export function sanitizeErrorMessage(
  raw: string | undefined | null
): SafeError {
  if (!raw || raw.trim() === "") {
    return {
      code: "unknown",
      message: "Unbekannter Fehler bei der Verarbeitung",
    };
  }

  const s = raw.toLowerCase();

  if (/authentication|apikey|api[_ ]key|authtoken|x-api-key|authorization/.test(s)) {
    return {
      code: "missing_credentials",
      message: "Anmeldedaten für den KI-Service fehlen oder sind ungültig",
    };
  }

  if (/rate.?limit|too many requests|\b429\b/.test(s)) {
    return {
      code: "rate_limited",
      message: "Anfragelimit erreicht — bitte in einem Moment erneut versuchen",
    };
  }

  if (/zeitüberschreitung|timeout|timed out/.test(s)) {
    return {
      code: "timeout",
      message:
        "Zeitüberschreitung bei der Analyse — Dokument ist zu groß oder Service reagiert nicht",
    };
  }

  if (/econnrefused|enotfound|network|fetch failed|socket hang up/.test(s)) {
    return {
      code: "network",
      message: "Netzwerkfehler — KI-Service nicht erreichbar",
    };
  }

  if (/payload too large|\b413\b|file too large/.test(s)) {
    return {
      code: "file_too_large",
      message: "Datei ist zu groß",
    };
  }

  if (/unsupported|invalid.*format|malformed/.test(s)) {
    return {
      code: "unsupported_format",
      message: "Dateiformat wird nicht unterstützt oder ist beschädigt",
    };
  }

  return {
    code: "unknown",
    message: truncate(stripSecrets(raw)),
  };
}

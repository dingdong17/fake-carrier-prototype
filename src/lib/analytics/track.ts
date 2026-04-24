// Client-side fire-and-forget analytics. Never blocks UX, never throws.
// Uses sendBeacon when available (survives page navigation), falls back to fetch.

export type TrackEvent =
  | "landing_view"
  | "hero_webinar_cta_click"
  | "hero_beta_cta_click"
  | "hero_login_cta_click"
  | "hero_secondary_cta_click"
  | "header_login_click"
  | "header_webinar_click"
  | "header_beta_click"
  | "webinar_register_submitted"
  | "webinar_confirmed"
  | "demo_register_submitted"
  | "demo_confirmed";

export type TrackMeta = {
  section?: string;
  variant?: string;
  slotId?: string;
  remaining?: number;
  errorCode?: string;
};

export function track(event: TrackEvent, meta?: TrackMeta): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ event, meta });
    const url = "/api/analytics";
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
  } catch {
    /* never throw from analytics */
  }
}

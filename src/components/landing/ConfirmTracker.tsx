"use client";

import { useEffect } from "react";
import { track, type TrackEvent } from "@/lib/analytics/track";

/**
 * Fires a one-shot analytics event when rendered. Used on confirm pages
 * to record webinar_confirmed / demo_confirmed once per view.
 */
export function ConfirmTracker({ event }: { event: TrackEvent }) {
  useEffect(() => {
    track(event);
  }, [event]);
  return null;
}

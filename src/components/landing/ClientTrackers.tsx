"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track, type TrackEvent } from "@/lib/analytics/track";
import { t } from "@/i18n";

export function LandingMount() {
  useEffect(() => {
    track("landing_view");
  }, []);
  return null;
}

/** Anchor-link that fires an analytics event on click. */
export function TrackedAnchor(props: {
  href: string;
  event: TrackEvent;
  className?: string;
  children: React.ReactNode;
  newTab?: boolean;
}) {
  return (
    <a
      href={props.href}
      className={props.className}
      onClick={() => track(props.event)}
      target={props.newTab ? "_blank" : undefined}
      rel={props.newTab ? "noopener noreferrer" : undefined}
    >
      {props.children}
    </a>
  );
}

/** Next.js Link that fires an analytics event on click. */
export function TrackedLink(props: {
  href: string;
  event: TrackEvent;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={props.href}
      className={props.className}
      onClick={() => track(props.event)}
    >
      {props.children}
    </Link>
  );
}

/** Header actions — rendered as a client island so clicks can be tracked. */
export function HeaderActions() {
  return (
    <div className="ec-head-actions">
      <TrackedLink className="btn btn-ghost" href="/login" event="header_login_click">
        {t("landing.header.ctas.login")}
      </TrackedLink>
      <TrackedAnchor className="btn btn-ghost" href="#webinar" event="header_webinar_click">
        {t("landing.header.ctas.webinar")}
      </TrackedAnchor>
      <TrackedAnchor className="btn btn-primary" href="#beta" event="header_beta_click">
        {t("landing.header.ctas.beta")}
      </TrackedAnchor>
    </div>
  );
}

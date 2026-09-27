"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

const SESSION_KEY = "noa.analytics.session";

type ContentType =
  | "home"
  | "edition"
  | "article"
  | "category"
  | "tag"
  | "author"
  | "search"
  | "commercial"
  | "legal"
  | "auth"
  | "other";

function classifyPath(pathname: string): { contentType: ContentType; editionCode: string | null } {
  if (pathname === "/") return { contentType: "home", editionCode: null };
  if (pathname === "/advertise") return { contentType: "commercial", editionCode: null };
  if (pathname === "/search") return { contentType: "search", editionCode: null };
  if (pathname === "/privacy" || pathname === "/editorial-guidelines" || pathname === "/account-deletion") {
    return { contentType: "legal", editionCode: null };
  }
  if (pathname === "/login" || pathname === "/register" || pathname.startsWith("/account")) {
    return { contentType: "auth", editionCode: null };
  }

  const parts = pathname.split("/").filter(Boolean);
  const editionCode = parts[0] && /^[a-z]{2,3}$/.test(parts[0]) ? parts[0] : null;

  if (editionCode) {
    if (parts.length === 1) return { contentType: "edition", editionCode };
    if (parts[1] === "article") return { contentType: "article", editionCode };
    if (parts[1] === "category") return { contentType: "category", editionCode };
    if (parts[1] === "tag") return { contentType: "tag", editionCode };
    if (parts[1] === "author") return { contentType: "author", editionCode };
  }

  return { contentType: "other", editionCode };
}

function getSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

function externalReferrerHost(): string | null {
  if (!document.referrer) return null;

  try {
    const referrer = new URL(document.referrer);
    return referrer.hostname === window.location.hostname ? null : referrer.hostname;
  } catch {
    return null;
  }
}

function deviceClass(): "mobile" | "tablet" | "desktop" {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function privacySignalEnabled(): boolean {
  const navigatorWithGpc = navigator as Navigator & { globalPrivacyControl?: boolean };
  return navigator.doNotTrack === "1" || navigatorWithGpc.globalPrivacyControl === true;
}

/**
 * NOA-138: first-party page-view measurement.
 *
 * Deliberately captures only the URL pathname, coarse content/edition/device
 * classification, external referrer hostname and a random per-tab session ID.
 * Query strings, account identifiers, emails, raw IPs and persistent visitor
 * identifiers are not sent.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !pathname || privacySignalEnabled()) return;

    const { contentType, editionCode } = classifyPath(pathname);

    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        path: pathname,
        contentType,
        editionCode,
        sessionId: getSessionId(),
        referrerHost: externalReferrerHost(),
        deviceClass: deviceClass(),
      }),
    }).catch(() => {
      // Analytics must never affect the reader experience.
    });
  }, [pathname]);

  return null;
}

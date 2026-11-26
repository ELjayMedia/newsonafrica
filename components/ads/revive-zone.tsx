"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { REVIVE_ID, REVIVE_URL, adSourceForPath } from "@/lib/ads/zones";
import { isValidCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    reviveAsync?: Record<string, { refresh?: () => void }>;
  }
}

const SCRIPT_SRC = `${REVIVE_URL}/delivery/asyncjs.php`;

function ensureReviveScript() {
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = SCRIPT_SRC;
  document.body.appendChild(s);
}

let refreshQueued = false;
/**
 * Zones mounting in the same render ask once: the first page load fetches the
 * script (which scans for every tag on start); after that, one refresh call
 * fetches all newly added zones in a single request.
 */
function requestAds() {
  if (refreshQueued) return;
  refreshQueued = true;
  setTimeout(() => {
    refreshQueued = false;
    const api = window.reviveAsync?.[REVIVE_ID];
    if (api?.refresh) api.refresh();
    else ensureReviveScript();
  }, 0);
}

export interface ReviveZoneProps {
  zoneId: number;
  width: number;
  height: number;
  label?: string;
  className?: string;
  /**
   * Only request the zone when this media query matches, so a desktop zone is
   * never fetched (and counted as an impression) on a phone, and vice versa.
   */
  media?: string;
  /** Called once the zone has a creative (not called for empty zones). */
  onFill?: () => void;
}

/**
 * One Revive async zone. Revive's script swaps the <ins> tag for the creative,
 * so the tag is created here outside React's tree (React only owns the empty
 * host div). Nothing shows, not even the "Advertisement" label, until Revive
 * returns a creative: an unsold zone takes no space (NOA-180).
 */
export function ReviveZone({ zoneId, width, height, label = "Advertisement", className, media, onFill }: ReviveZoneProps) {
  const pathname = usePathname();
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [filled, setFilled] = React.useState(false);
  const onFillRef = React.useRef(onFill);
  onFillRef.current = onFill;

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setFilled(false);
    host.replaceChildren();
    if (media && !window.matchMedia(media).matches) return;

    const ins = document.createElement("ins");
    ins.setAttribute("data-revive-zoneid", String(zoneId));
    ins.setAttribute("data-revive-id", REVIVE_ID);
    ins.setAttribute("data-revive-source", adSourceForPath(pathname, isValidCountry));
    host.appendChild(ins);

    const loadedEvent = `revive-${REVIVE_ID}-loaded`;
    const onLoaded = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string; data?: { html?: string } }>).detail;
      if (!detail?.id || !detail.data?.html) return;
      const el = document.getElementById(detail.id);
      if (el && host.contains(el)) {
        setFilled(true);
        onFillRef.current?.();
      }
    };
    document.addEventListener(loadedEvent, onLoaded);

    requestAds();

    return () => {
      document.removeEventListener(loadedEvent, onLoaded);
      host.replaceChildren();
    };
  }, [zoneId, pathname, media]);

  return (
    <div className={cn(!filled && "hidden", className)} data-ad-zone={zoneId} data-ad-filled={filled ? "true" : "false"}>
      <p className="noa-eyebrow mb-2 text-center text-[0.625rem] tracking-[0.18em] text-noa-faint lg:text-[0.75rem]">
        {label}
      </p>
      <div
        ref={hostRef}
        role="complementary"
        aria-label="Advertisement"
        className="mx-auto flex items-center justify-center overflow-hidden"
        style={{ maxWidth: "100%", width, minHeight: filled ? height : undefined }}
      />
    </div>
  );
}

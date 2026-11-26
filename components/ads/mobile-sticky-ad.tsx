"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { ReviveZone } from "@/components/ads/revive-zone";
import { AD_PREVIEW } from "@/lib/ads/preview";
import { ADS_ENABLED, AD_ZONES, DEVICE_MEDIA } from "@/lib/ads/zones";
import { isArticlePath } from "@/lib/article/route";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "noa-sticky-ad-dismissed";

/**
 * Mobile sticky anchor (320×50, Revive zone "Mobile · Sticky anchor"). Pinned
 * to the bottom of the screen, just above the tab bar where there is one, and
 * shown only once Revive returns a creative. Readers can close it; it then
 * stays closed for the rest of the visit.
 */
export function MobileStickyAd() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = React.useState(true);
  const [filled, setFilled] = React.useState(false);

  React.useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!ADS_ENABLED || AD_PREVIEW || dismissed) return null;

  const zone = AD_ZONES["mobile-sticky-anchor"];
  // The tab bar (md:hidden, h-16) is absent on article pages.
  const aboveTabBar = !isArticlePath(pathname);

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 lg:hidden",
        aboveTabBar ? "bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0" : "bottom-0 pb-[env(safe-area-inset-bottom)]",
        filled && "border-t border-noa-hairline bg-noa-paper/95 backdrop-blur",
      )}
    >
      <div className="relative mx-auto w-fit">
        <ReviveZone
          zoneId={zone.zoneId}
          width={zone.width}
          height={zone.height}
          label="Advertisement"
          className="py-1 [&>p]:mb-1 [&>p]:text-[0.5625rem]"
          media={DEVICE_MEDIA.mobile}
          onFill={() => setFilled(true)}
        />
        {filled ? (
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
            aria-label="Close advertisement"
            className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full border border-noa-hairline bg-noa-white text-xs font-bold text-noa-ink shadow"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

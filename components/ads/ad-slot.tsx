import * as React from "react";

import { ReviveZone } from "@/components/ads/revive-zone";
import { AD_PREVIEW } from "@/lib/ads/preview";
import { ADS_ENABLED, AD_ZONES, DEVICE_MEDIA, deviceVisibilityClass, type AdPlacement } from "@/lib/ads/zones";
import { cn } from "@/lib/utils";

/**
 * Advertising is a first-class citizen (design system §05). Each slot is one
 * Revive zone (lib/ads/zones.ts). Live slots stay collapsed until Revive returns
 * a creative, so unsold inventory never leaves a hole or a fake ad (NOA-180).
 * With NEXT_PUBLIC_AD_PREVIEW=1 every slot instead shows its labelled IAB frame
 * for layout and sales review.
 *
 * Every unit carries an "Advertisement" micro-label so paid inventory is always
 * disclosed, per the design system's "first-class, clearly-labelled" rule.
 * Desktop placements render from `lg` up, mobile placements below it.
 */
const CAPTION: Record<string, string> = {
  "970x250": "970 × 250 — Billboard",
  "728x90": "728 × 90 — Leaderboard",
  "300x250": "300 × 250 — MPU",
  "300x600": "300 × 600 — Half page",
  "160x600": "160 × 600 — Skyscraper",
  "320x50": "320 × 50 — Mobile banner",
};

export interface AdSlotProps {
  placement: AdPlacement;
  /** Micro-label above the creative. */
  label?: string;
  /** Sticks the unit to the top of its column as the page scrolls (half-page). */
  sticky?: boolean;
  className?: string;
}

export function AdSlot({ placement, label = "Advertisement", sticky = false, className }: AdSlotProps) {
  const zone = AD_ZONES[placement];
  const wrapper = cn(deviceVisibilityClass(zone.device), sticky && "lg:sticky lg:top-24", className);

  if (AD_PREVIEW) {
    return (
      <div className={wrapper} data-ad-placement={placement} data-ad-filled="true">
        <p className="noa-eyebrow mb-2 text-center text-[0.625rem] tracking-[0.18em] text-noa-faint lg:text-[0.75rem]">
          {label}
        </p>
        <div
          role="complementary"
          aria-label="Advertisement"
          style={{ maxWidth: zone.width, aspectRatio: `${zone.width} / ${zone.height}` }}
          className="mx-auto flex w-full flex-col items-center justify-center rounded-[10px] border border-dashed border-noa-hairline bg-noa-paper text-center"
        >
          <span className="font-display text-sm font-extrabold tracking-wide text-noa-faint">
            {CAPTION[`${zone.width}x${zone.height}`] ?? `${zone.width} × ${zone.height}`}
          </span>
          <span className="mt-1 text-xs text-noa-faint/80">{placement}</span>
        </div>
      </div>
    );
  }

  if (!ADS_ENABLED) return null;

  // Spacing classes go on the zone itself, which stays display:none until
  // filled, so an unsold slot leaves no margin behind either.
  return (
    <div className={cn(deviceVisibilityClass(zone.device), sticky && "lg:sticky lg:top-24")} data-ad-placement={placement}>
      <ReviveZone
        zoneId={zone.zoneId}
        width={zone.width}
        height={zone.height}
        label={label}
        className={className}
        media={DEVICE_MEDIA[zone.device]}
      />
    </div>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Advertising is a first-class citizen (design system §05). These are the
 * labelled IAB placeholders that appear across the homepage: a billboard under
 * the nav, a mid-rail MPU and a sticky half-page in the right rail. They render
 * as clearly-marked empty frames now; a real ad server (GPT/Prebid) drops its
 * creative into the inner slot later without changing the surrounding layout.
 *
 * Every unit carries an "Advertisement" micro-label so paid inventory is always
 * disclosed, per the design system's "first-class, clearly-labelled" rule.
 */
export type AdFormat = "billboard" | "leaderboard" | "mpu" | "half-page";

const FORMAT: Record<AdFormat, { w: number; h: number; caption: string; note?: string }> = {
  billboard: {
    w: 970,
    h: 250,
    caption: "970 × 250 — Billboard",
    note: "collapses to 728×90 · part of the takeover buy",
  },
  leaderboard: { w: 728, h: 90, caption: "728 × 90 — Leaderboard" },
  mpu: { w: 300, h: 250, caption: "300 × 250" },
  "half-page": { w: 300, h: 600, caption: "300 × 600" },
};

export interface AdSlotProps {
  format: AdFormat;
  /** Micro-label above the frame. */
  label?: string;
  /** Sticks the unit to the top of its column as the page scrolls (half-page). */
  sticky?: boolean;
  className?: string;
}

export function AdSlot({
  format,
  label = "Advertisement",
  sticky = false,
  className,
}: AdSlotProps) {
  const { w, h, caption, note } = FORMAT[format];

  return (
    <div className={cn(sticky && "lg:sticky lg:top-24", className)}>
      <p className="noa-eyebrow mb-2 text-center text-[0.625rem] tracking-[0.18em] text-noa-faint">
        {label}
      </p>
      <div
        role="complementary"
        aria-label="Advertisement"
        style={{ maxWidth: w, aspectRatio: `${w} / ${h}` }}
        className="mx-auto flex w-full flex-col items-center justify-center rounded-[10px] border border-dashed border-noa-hairline bg-noa-paper text-center"
      >
        <span className="font-display text-sm font-extrabold tracking-wide text-noa-faint">
          {caption}
        </span>
        {note ? <span className="mt-1 max-w-[80%] text-xs text-noa-faint/80">{note}</span> : null}
      </div>
    </div>
  );
}

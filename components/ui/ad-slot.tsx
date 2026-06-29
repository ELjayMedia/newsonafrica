import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * AdSlot — News On Africa design system, ad system (revenue pillar).
 *
 * Advertising is a first-class citizen: every layout reserves fixed,
 * predictable slots. Slots use IAB-standard sizes so any ad server (GAM,
 * AdSense, direct sales) drops straight in. Three rules keep it trustworthy:
 *   ① Always label — "Advertisement" / "Sponsored"
 *   ② Reserve height — no layout shift on load
 *   ③ Never mimic editorial headlines
 *
 * This is the presentational shell: it renders the labelled, height-reserved
 * surface. Drop the ad-server markup in via `children`.
 */
export type AdFormat = "leaderboard" | "mpu" | "half-page" | "mobile-banner" | "in-content"

const AD_FORMATS: Record<AdFormat, { label: string; reserve: string; max: string }> = {
  // Leaderboard / billboard — below primary nav, above the first story
  leaderboard: { label: "728 × 90", reserve: "min-h-[90px]", max: "max-w-[970px]" },
  // Sidebar MPU — the bread-and-butter unit in the right rail
  mpu: { label: "300 × 250", reserve: "min-h-[250px]", max: "max-w-[300px]" },
  // Half-page — sticky in the right rail on long articles
  "half-page": { label: "300 × 600", reserve: "min-h-[600px]", max: "max-w-[300px]" },
  // Mobile banner — sticky 320×100, anchors the bottom of the app feed
  "mobile-banner": { label: "320 × 100", reserve: "min-h-[100px]", max: "max-w-[320px]" },
  // In-article inline — dropped between paragraphs after the 3rd
  "in-content": { label: "300 × 250", reserve: "min-h-[250px]", max: "max-w-[300px]" },
}

export interface AdSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  format: AdFormat
  /** Disclosure label. Defaults to "Advertisement"; use "Sponsored" for native/paid partnerships. */
  label?: string
  /** Sticky placement (half-page rail, mobile bottom banner). */
  sticky?: boolean
  /** Ad-server markup (script, iframe, slot div). When absent, a labelled placeholder is shown. */
  children?: React.ReactNode
}

export function AdSlot({ format, label = "Advertisement", sticky = false, className, children, ...props }: AdSlotProps) {
  const config = AD_FORMATS[format]

  return (
    <aside
      // Always labelled for screen readers and ad policy compliance
      aria-label={label}
      role="complementary"
      className={cn(
        "mx-auto flex w-full flex-col items-center justify-center overflow-hidden rounded bg-ad text-ad-foreground",
        config.reserve,
        config.max,
        sticky && "sticky top-20",
        className,
      )}
      {...props}
    >
      {/* ① Always label — never mimic editorial */}
      <span className="text-ui-sm font-display font-semibold uppercase tracking-wider text-ad-foreground/80">{label}</span>
      {children ?? <span className="mt-1 text-ui-sm text-ad-foreground/60">{config.label}</span>}
    </aside>
  )
}

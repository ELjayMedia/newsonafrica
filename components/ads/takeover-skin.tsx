"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { isValidCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

/**
 * Full-page takeover / wallpaper skin (design system §05, the homepage mockup's
 * signature commercial unit). A fixed dark-green gradient layer paints the page
 * gutters behind the centred white content well; a sponsor creative sits in each
 * gutter. Sold together with the billboard as a single premium "takeover buy".
 *
 * Rendered once at the body level (behind the .noa-well sheet, which carries
 * `z-10`) so the fixed layer sits *under* the sheet rather than over its
 * content. Shown only on the home routes (`/` and each edition home) and only
 * once the viewport is wide enough (≥1440px) for the gutters to breathe; below
 * that the page reads as a normal centred sheet on paper.
 *
 * The rails are labelled placeholders: they demonstrate the format at full
 * fidelity but carry neutral demo copy and an "Advertisement" label rather than
 * a specific advertiser's campaign — real skin creative slots in unchanged.
 */
function isHomeRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return true; // pan-African root
  return segments.length === 1 && isValidCountry(segments[0]!); // edition home
}

function RailSkin({ side }: { side: "left" | "right" }) {
  const alignEnd = side === "left";
  return (
    <div
      aria-hidden
      className={cn(
        "absolute top-0 bottom-0 flex w-[calc((100%-var(--noa-well-w))/2)] min-w-0 flex-col gap-4 px-7 pt-32",
        alignEnd ? "left-0 items-end text-right" : "right-0 items-start text-left",
      )}
    >
      <span className="noa-eyebrow text-[0.625rem] tracking-[0.18em] text-[#5f6f64]">
        Advertisement
      </span>
      <div
        className={cn(
          "flex max-w-[230px] flex-col gap-3.5",
          alignEnd ? "items-end" : "items-start",
        )}
      >
        <span className="font-display text-xs font-black tracking-[0.12em] text-[#9fe3bd]">
          SPONSOR
        </span>
        <span className="noa-hed-tight text-[2rem] text-white">Your takeover headline here.</span>
        <span className="max-w-[200px] text-sm leading-relaxed text-[#a9bdb0]">
          Premium full-page canvas — skin + billboard sold as one buy.
        </span>
        <span className="mt-1.5 rounded-full bg-noa-green-bright px-4.5 py-2 font-display text-xs font-extrabold text-[#0c1410]">
          Discover more →
        </span>
        <span
          className="mt-4 h-[74px] w-[74px] rounded-[18px]"
          style={{ background: "linear-gradient(135deg,#1BB257,#0B5E2D)" }}
        />
      </div>
    </div>
  );
}

export interface TakeoverSkinProps {
  /** Toggle the whole buy off (no takeover sold) — mirrors the mockup's skinDisplay. */
  enabled?: boolean;
}

export function TakeoverSkin({ enabled = true }: TakeoverSkinProps) {
  const pathname = usePathname();
  if (!enabled || !isHomeRoute(pathname)) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden min-[1440px]:block"
      style={{
        background: "radial-gradient(120% 80% at 50% 0%, #103b24 0%, #0c1410 60%, #080d0a 100%)",
      }}
    >
      <RailSkin side="left" />
      <RailSkin side="right" />
    </div>
  );
}

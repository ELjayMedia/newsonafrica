"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { ReviveZone } from "@/components/ads/revive-zone";
import { AD_PREVIEW } from "@/lib/ads/preview";
import { ADS_ENABLED, AD_ZONES } from "@/lib/ads/zones";
import { DEFAULT_SKIN, skinSourceFor, wallpaperFromCreative, type Wallpaper } from "@/lib/ads/skin";
import { isHomeRoute } from "@/lib/ads/routes";
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
 * Live, the gutters are two Revive zones (LiveTakeover); the demo rails below
 * only render in ad preview, so demo creative is never presented as paid
 * advertising (NOA-180).
 */

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
  /** Force the preview creative on (design review); otherwise AD_PREVIEW decides. */
  preview?: boolean;
}

type Side = "left" | "right";

/** Resolve one gutter's background from its creative (see lib/ads/skin.ts). */
async function resolveSkin(html: string, side: Side): Promise<string> {
  const source = skinSourceFor(html);
  if (source.kind === "value") return source.value;
  if (source.kind === "image") {
    try {
      const res = await fetch(`/api/ads/skin?src=${encodeURIComponent(source.src)}&edge=${side}`);
      const { color } = (await res.json()) as { color?: string | null };
      if (color) return color;
    } catch {
      // fall through to the default skin
    }
  }
  return DEFAULT_SKIN;
}

/**
 * Live takeover: two Revive zones ("Desktop · Takeover skin left/right",
 * 160×600) in the page gutters. Each gutter is painted to match its own
 * creative (explicit data-noa-skin, the image's outer-edge colour, or the
 * HTML creative's background), so the page blends into the ad. Nothing paints
 * until a side fills: an unsold takeover leaves the normal page.
 */
function LiveTakeover() {
  const [skins, setSkins] = React.useState<Record<Side, string | null>>({
    left: null,
    right: null,
  });
  const [wallpaper, setWallpaper] = React.useState<Wallpaper | null>(null);
  const [wallpaperFill, setWallpaperFill] = React.useState<string | null>(null);
  const onWallpaper = (html: string) => {
    const wp = wallpaperFromCreative(html);
    setWallpaper(wp);
    // Screen beyond the image (wider than 1920px, or taller than it) takes the
    // colour of the image's bottom edge, so it reads as one canvas.
    if (wp?.image) {
      void fetch(`/api/ads/skin?src=${encodeURIComponent(wp.image)}&edge=bottom`)
        .then((r) => r.json() as Promise<{ color?: string | null }>)
        .then(({ color }) => setWallpaperFill(color ?? null))
        .catch(() => undefined);
    }
  };
  const wallpaperZone = AD_ZONES["desktop-takeover-wallpaper"];
  const onFill = (side: Side) => (html: string) => {
    void resolveSkin(html, side).then((bg) => setSkins((s) => ({ ...s, [side]: bg })));
  };
  // A sold side with an unsold partner: mirror the sold side's skin.
  const left = skins.left ?? skins.right;
  const right = skins.right ?? skins.left;

  const gutter = (side: Side, background: string | null) => (
    <div
      className={cn(
        "absolute top-0 bottom-0 flex w-[calc((100%-var(--noa-well-w))/2)] min-w-0 justify-center pt-32 transition-[background] duration-500",
        side === "left" ? "left-0" : "right-0",
      )}
      style={
        // A sold wallpaper shows through the gutters; otherwise each gutter
        // blends with its own creative.
        background && !wallpaper
          ? { background, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      {wallpaper ? (
        <>
          <span className="absolute top-14 left-1/2 -translate-x-1/2 rounded bg-black/45 px-1.5 py-0.5 font-display text-[0.5625rem] font-bold tracking-[0.18em] text-white/85 uppercase">
            Advertisement
          </span>
          {wallpaper.clickUrl ? (
            <a
              href={wallpaper.clickUrl}
              target="_blank"
              rel="sponsored noopener"
              aria-label="Advertisement (opens the advertiser's site)"
              className="pointer-events-auto absolute inset-0"
            />
          ) : null}
        </>
      ) : null}
      <div className="pointer-events-auto h-fit [&_p]:text-white/70 [&_p]:mix-blend-difference">
        <ReviveZone
          zoneId={AD_ZONES[`desktop-takeover-${side}`].zoneId}
          width={AD_ZONES[`desktop-takeover-${side}`].width}
          height={AD_ZONES[`desktop-takeover-${side}`].height}
          media="(min-width: 1440px)"
          onFill={onFill(side)}
        />
      </div>
    </div>
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden min-[1440px]:block"
      style={
        wallpaper
          ? { background: wallpaper.background, backgroundColor: wallpaperFill ?? "#0c1410" }
          : left || right
            ? { background: left ?? DEFAULT_SKIN }
            : undefined
      }
    >
      {/* With a wallpaper, the page column keeps its normal grey canvas so the
          gaps between panels never show the artwork: only the gutters do. The
          strip is the 970px visible box plus --noa-skin-gap each side (narrower
          than the well) so the wallpaper sits close to the billboard. */}
      {wallpaper ? (
        <div className="absolute inset-y-0 left-1/2 w-[calc(970px+2*var(--noa-skin-gap))] -translate-x-1/2 bg-noa-canvas" />
      ) : null}
      {gutter("left", left)}
      {gutter("right", right)}
      {/* The wallpaper zone is fetched off-screen (so Revive still logs the
          impression via the creative's beacon) and painted as the page
          background above. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
      >
        <ReviveZone
          zoneId={wallpaperZone.zoneId}
          width={wallpaperZone.width}
          height={wallpaperZone.height}
          media="(min-width: 1440px)"
          onFill={onWallpaper}
        />
      </div>
    </div>
  );
}

export function TakeoverSkin({ preview = AD_PREVIEW }: TakeoverSkinProps) {
  const pathname = usePathname();
  if (!isHomeRoute(pathname)) return null;
  if (!preview) return ADS_ENABLED ? <LiveTakeover /> : null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden min-[1440px]:block"
      style={{ background: DEFAULT_SKIN }}
    >
      <RailSkin side="left" />
      <RailSkin side="right" />
    </div>
  );
}

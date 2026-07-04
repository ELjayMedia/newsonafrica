/**
 * Shared branded card markup for the next/og ImageResponse routes (NOA-115):
 * `app/opengraph-image.tsx` (site-wide default) and
 * `app/[countryCode]/article/[slug]/opengraph-image.tsx`.
 *
 * Satori-compatible JSX only (flexbox, inline styles — no CSS classes).
 * Colours come from `lib/design-tokens` (dark theme + brand green) so the
 * cards can't drift from the design system.
 */
import { colorTokens } from "@/lib/design-tokens";
import { SITE_NAME } from "@/lib/seo/config";
import { hslChannelsToHex } from "@/lib/seo/og-color";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = "image/png";

/** Headline for the site-wide default card and per-article fallbacks. */
export const DEFAULT_OG_TITLE = "News & headlines from across Africa";

// Tokens converted to hex — satori mis-parses fractional hsl() components
// (see lib/seo/og-color.ts).
const background = hslChannelsToHex(colorTokens.dark.background);
const foreground = hslChannelsToHex(colorTokens.dark.foreground);
const mutedForeground = hslChannelsToHex(colorTokens.dark.mutedForeground);
/** Brand green — the dark-theme primary reads best on the dark card. */
const brandGreen = hslChannelsToHex(colorTokens.dark.primary);

const TITLE_MAX_CHARS = 140;

/** Clamp CMS titles so satori never overflows the card. */
export function truncateOgTitle(title: string): string {
  const plain = title.replace(/\s+/g, " ").trim();
  if (plain.length <= TITLE_MAX_CHARS) return plain;
  return `${plain.slice(0, TITLE_MAX_CHARS - 1).trimEnd()}…`;
}

export interface OgCardProps {
  /** Headline (article title or site tagline). Pre-truncated via truncateOgTitle. */
  title: string;
  /** Optional kicker above the title, e.g. "Eswatini · Politics". */
  eyebrow?: string;
}

export function OgCard({ title, eyebrow }: OgCardProps) {
  const titleSize = title.length > 90 ? 52 : title.length > 50 ? 60 : 72;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: background,
        padding: "64px 72px",
      }}
    >
      {/* Brand row */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            backgroundColor: brandGreen,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: background,
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          N
        </div>
        <div
          style={{
            color: foreground,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {SITE_NAME}
        </div>
      </div>

      {/* Headline block */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {eyebrow ? (
          <div
            style={{
              color: brandGreen,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            color: foreground,
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>
      </div>

      {/* Footer rule */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ width: 160, height: 10, borderRadius: 5, backgroundColor: brandGreen }} />
        <div style={{ color: mutedForeground, fontSize: 26 }}>Independent African journalism</div>
      </div>
    </div>
  );
}

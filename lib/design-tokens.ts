/**
 * Design tokens (NOA-82) — documentation + programmatic reference.
 *
 * The CSS custom properties in `app/globals.css` are the runtime source of
 * truth (they support light/dark theming and are consumed by Tailwind v4
 * utilities). This module mirrors those tokens as typed constants for use in
 * non-CSS contexts (charts, canvas, emails, docs, the /design-system route).
 * `lib/design-tokens.test.ts` parses globals.css and fails if the two drift.
 *
 * Semantic colours are stored as raw HSL channel triples ("H S% L%") so they
 * can be composed as `hsl(<value>)` and match the `--token` CSS variables
 * exactly. Keys are the camelCase form of the variable name
 * (`mutedForeground` ↔ `--muted-foreground`).
 */

export const colorTokens = {
  light: {
    background: "0 0% 100%",
    foreground: "30 10% 8%", // Ink #161412
    card: "0 0% 100%",
    cardForeground: "30 10% 8%",
    popover: "0 0% 100%",
    popoverForeground: "30 10% 8%",
    primary: "142.1 76.2% 36.3%", // Green 600 #15994A
    primaryForeground: "0 0% 98%",
    secondary: "40 14% 98%", // Paper #FAFAF9
    secondaryForeground: "30 10% 8%",
    muted: "40 14% 98%",
    mutedForeground: "30 4% 42%", // #6E6A66
    accent: "36 10% 92%",
    accentForeground: "30 10% 8%",
    destructive: "0 68% 50%", // Live/breaking red #D62828
    destructiveForeground: "0 0% 98%",
    success: "142 76% 36%",
    successForeground: "0 0% 98%",
    warning: "38 92% 50%",
    warningForeground: "0 0% 9%",
    info: "217 91% 60%",
    infoForeground: "0 0% 98%",
    border: "36 10% 92%", // Hairline #ECEAE7
    input: "36 10% 92%",
    ring: "142.1 76.2% 36.3%",
  },
  dark: {
    background: "240 10% 3.9%",
    foreground: "0 0% 98%",
    card: "240 10% 3.9%",
    cardForeground: "0 0% 98%",
    popover: "240 10% 3.9%",
    popoverForeground: "0 0% 98%",
    primary: "142.1 70.6% 45.3%",
    primaryForeground: "144 80% 10%",
    secondary: "240 5% 26%",
    secondaryForeground: "0 0% 98%",
    muted: "240 5% 26%",
    mutedForeground: "240 5% 65%",
    accent: "240 5% 26%",
    accentForeground: "0 0% 98%",
    destructive: "0 62.8% 50.6%",
    destructiveForeground: "0 0% 98%",
    success: "142 69% 58%",
    successForeground: "144 80% 10%",
    warning: "43 96% 56%",
    warningForeground: "0 0% 9%",
    info: "213 93% 68%",
    infoForeground: "0 0% 9%",
    border: "240 5% 26%",
    input: "240 5% 26%",
    ring: "142.1 70.6% 45.3%",
  },
} as const;

/**
 * News On Africa brand palette (design system v1.0, "Bold Punch"), exposed as
 * the `noa-*` Tailwind colours. Hex values. The greens and live red are fixed
 * across themes; the neutrals (and the small-text green) flip under `.dark`.
 * Keys map to `--noa-<kebab-case>` (`greenText` ↔ `--noa-green-text`).
 */
const brandLight = {
  paper: "#fafaf9",
  white: "#ffffff",
  ink: "#161412",
  body: "#2b2825",
  muted: "#6e6a66",
  faint: "#76716c", // 4.5:1 on white for 12px meta text
  hairline: "#eceae7",
  green: "#15994a", // Green 600 — primary
  greenDark: "#0b5e2d", // Green 900
  greenBright: "#1bb257", // Green 500
  green50: "#e8f6ee",
  green200: "#a6e2be",
  greenText: "#117f3d", // brand green for small text, 5.09:1 on white
  live: "#d62828",
  canvas: "#efedea", // desktop page canvas behind the white panels
} as const;

export const brandTokens = {
  light: brandLight,
  dark: {
    ...brandLight,
    paper: "#18181b",
    white: "#09090b",
    ink: "#fafafa",
    body: "#e4e4e7",
    muted: "#a1a1aa",
    faint: "#8b8b93",
    hairline: "#27272a",
    greenText: "#1bb257",
    canvas: "#1c1c1f",
  },
} as const;

/**
 * Layout tokens. `wellWidth` is `--noa-well-w`: the centred content column
 * that the header, page content and takeover-skin gutters all share. From lg
 * it is 1018px, a 970px visible box (matching the 970×250 billboard) plus
 * 24px gutters. It stays fixed so the side gutters remain available for
 * wallpaper/takeover ads. `skinGap` is `--noa-skin-gap`: with a wallpaper,
 * the grey canvas behind the page is only the 970px box plus this each side,
 * so the artwork shows inside the well's gutters, close to the billboard.
 */
export const layoutTokens = {
  wellWidth: { base: "980px", lg: "1018px" },
  skinGap: "8px",
  railWidth: "320px",
  /** Gap between the main panel, the rail and stacked rail panels (lg+). */
  panelGap: "12px",
} as const;

/** Breakpoint (px) from which the desktop layout and root scale apply. */
export const desktopBreakpointPx = 1024;

/**
 * From lg up the root font size is 83.333%, so every rem value in the
 * typography and spacing scales renders at 5/6 of its listed size.
 */
export const desktopRootScale = 5 / 6;

/** Minimum rendered size for small text (meta, eyebrows, text-xs). */
export const smallTextFloorPx = 11;

/** Typeface roles: `sans` is Source Sans 3 (body), `display` is Archivo. */
export type FontRole = "sans" | "display";

interface TypeStyle {
  /** CSS font-size as written in globals.css. Omitted where size is set per use. */
  size?: string;
  /** Omitted where the class inherits the weight (400). */
  weight?: number;
  family?: FontRole;
}

/**
 * Semantic typography scale. Each key is a helper class in globals.css and
 * the values are its base (mobile) declarations; see `desktopRootScale`.
 */
export const typographyScale = {
  "display-2xl": { size: "clamp(3rem, 8vw, 4.5rem)", weight: 800 },
  "display-xl": { size: "clamp(2.25rem, 6vw, 3.75rem)", weight: 700 },
  "display-lg": { size: "clamp(1.875rem, 5vw, 3rem)", weight: 700 },
  "display-article": {
    size: "clamp(1.75rem, 1.35rem + 1.6vw, 2.5rem)",
    weight: 800,
    family: "display",
  },
  "heading-lg": { size: "1.5rem", weight: 600 },
  "heading-md": { size: "1.25rem", weight: 600 },
  "heading-sm": { size: "1.125rem", weight: 600 },
  "body-lg": { size: "1rem" },
  "body-md": { size: "0.9375rem" },
  "body-sm": { size: "0.875rem" },
  "ui-md": { size: "0.875rem", weight: 500 },
  "ui-sm": { size: "max(11px, 0.75rem)", weight: 500 },
  // Bold Punch editorial styles.
  "noa-eyebrow": { size: "max(11px, 0.75rem)", weight: 800, family: "display" },
  "noa-hed": { weight: 800, family: "display" },
  "noa-hed-tight": { weight: 900, family: "display" },
  "noa-wordmark": { weight: 900, family: "display" },
  "story-hed": { weight: 700, family: "display" },
  "story-meta": { size: "max(11px, 0.8125rem)" },
  "section-title": { size: "1.25rem", weight: 800, family: "display" },
} as const satisfies Record<string, TypeStyle>;

/** Spacing scale (rem) — aligns with the default Tailwind 4px-based scale. */
export const spacingScale = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
} as const;

/** Border radius scale — derived from the --radius base token (0.625rem). */
export const radiusScale = {
  sm: "calc(0.625rem - 4px)",
  md: "calc(0.625rem - 2px)",
  lg: "0.625rem",
  xl: "calc(0.625rem + 4px)",
  /** Photos and media frames (`rounded-media`). */
  media: "3px",
} as const;

export type ColorTokenName = keyof typeof colorTokens.light;
export type BrandTokenName = keyof typeof brandTokens.light;
export type TypographyTokenName = keyof typeof typographyScale;

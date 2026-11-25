/**
 * Design tokens (NOA-82) — documentation + programmatic reference.
 *
 * The CSS custom properties in `app/globals.css` are the runtime source of
 * truth (they support light/dark theming and are consumed by Tailwind v4
 * utilities). This module mirrors those tokens as typed constants for use in
 * non-CSS contexts (charts, canvas, emails, docs, the /design-system route).
 *
 * Colours are stored as raw HSL channel triples ("H S% L%") so they can be
 * composed as `hsl(<value>)` and match the `--token` CSS variables exactly.
 */

export const colorTokens = {
  light: {
    background: "0 0% 100%",
    foreground: "240 10% 3.9%",
    card: "0 0% 100%",
    primary: "142.1 76.2% 36.3%",
    secondary: "240 4.8% 95.9%",
    muted: "240 4.8% 95.9%",
    mutedForeground: "240 7% 40%",
    accent: "240 4.8% 95.9%",
    destructive: "0 84.2% 60.2%",
    success: "142 76% 36%",
    warning: "38 92% 50%",
    info: "217 91% 60%",
    border: "240 5.9% 90%",
    ring: "142.1 76.2% 36.3%",
  },
  dark: {
    background: "240 10% 3.9%",
    foreground: "0 0% 98%",
    card: "240 10% 3.9%",
    primary: "142.1 70.6% 45.3%",
    secondary: "240 5% 26%",
    muted: "240 5% 26%",
    mutedForeground: "240 5% 65%",
    accent: "240 5% 26%",
    destructive: "0 62.8% 50.6%",
    success: "142 69% 58%",
    warning: "43 96% 56%",
    info: "213 93% 68%",
    border: "240 5% 26%",
    ring: "142.1 70.6% 45.3%",
  },
} as const;

/**
 * Semantic typography scale. Each maps to a helper class in globals.css.
 * Sizes are the base (mobile) values. From lg (1024px) up the root font size
 * is 83.333%, so every rem value renders at 5/6 of what is listed here, with
 * small text floored at 11px and article body held at ~17px.
 */
export const desktopRootScale = 5 / 6;

/** Minimum rendered size for small text (meta, eyebrows, text-xs). */
export const smallTextFloorPx = 11;
export const typographyScale = {
  "display-2xl": { size: "clamp(3rem, 8vw, 4.5rem)", weight: 800 },
  "display-xl": { size: "clamp(2.25rem, 6vw, 3.75rem)", weight: 700 },
  "display-lg": { size: "clamp(1.875rem, 5vw, 3rem)", weight: 700 },
  "heading-lg": { size: "1.5rem", weight: 600 },
  "heading-md": { size: "1.25rem", weight: 600 },
  "heading-sm": { size: "1.125rem", weight: 600 },
  "body-lg": { size: "1rem", weight: 400 },
  "body-md": { size: "0.9375rem", weight: 400 },
  "body-sm": { size: "0.875rem", weight: 400 },
  "ui-md": { size: "0.875rem", weight: 500 },
  "ui-sm": { size: "0.75rem", weight: 500 },
} as const;

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
export type TypographyTokenName = keyof typeof typographyScale;

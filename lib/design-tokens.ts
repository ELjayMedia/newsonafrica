/**
 * Design System Tokens
 * Centralized design tokens for the News On Africa application
 */

export const designTokens = {
  // Color Tokens
  colors: {
    // Brand Colors
    brand: {
      primary: "hsl(var(--primary))",
      "primary-foreground": "hsl(var(--primary-foreground))",
      secondary: "hsl(var(--secondary))",
      "secondary-foreground": "hsl(var(--secondary-foreground))",
    },

    // Semantic Colors
    success: {
      DEFAULT: "hsl(142 76% 36%)", // Green-600
      foreground: "hsl(0 0% 98%)",
      light: "hsl(142 69% 58%)", // Green-500
      dark: "hsl(142 72% 29%)", // Green-700
    },

    warning: {
      DEFAULT: "hsl(38 92% 50%)", // Amber-500
      foreground: "hsl(0 0% 9%)",
      light: "hsl(43 96% 56%)", // Amber-400
      dark: "hsl(32 95% 44%)", // Amber-600
    },

    info: {
      DEFAULT: "hsl(217 91% 60%)", // Blue-500
      foreground: "hsl(0 0% 98%)",
      light: "hsl(213 93% 68%)", // Blue-400
      dark: "hsl(221 83% 53%)", // Blue-600
    },

    // Surface Colors
    surface: {
      DEFAULT: "hsl(var(--card))",
      foreground: "hsl(var(--card-foreground))",
      elevated: "hsl(var(--popover))",
      "elevated-foreground": "hsl(var(--popover-foreground))",
      muted: "hsl(var(--muted))",
      "muted-foreground": "hsl(var(--muted-foreground))",
    },

    // State Colors
    states: {
      hover: "hsl(var(--accent))",
      "hover-foreground": "hsl(var(--accent-foreground))",
      focus: "hsl(var(--ring))",
      disabled: "hsl(var(--muted))",
      "disabled-foreground": "hsl(var(--muted-foreground))",
    },
  },

  // Spacing Scale (based on 4px grid)
  spacing: {
    "0": "0px",
    px: "1px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "3.5": "14px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "28px",
    "8": "32px",
    "9": "36px",
    "10": "40px",
    "11": "44px",
    "12": "48px",
    "14": "56px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
    "28": "112px",
    "32": "128px",
    "36": "144px",
    "40": "160px",
    "44": "176px",
    "48": "192px",
    "52": "208px",
    "56": "224px",
    "60": "240px",
    "64": "256px",
    "72": "288px",
    "80": "320px",
    "96": "384px",
  },

  // Typography Scale
  typography: {
    fontSizes: {
      xs: ["12px", { lineHeight: "16px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "24px" }],
      lg: ["18px", { lineHeight: "28px" }],
      xl: ["20px", { lineHeight: "28px" }],
      "2xl": ["24px", { lineHeight: "32px" }],
      "3xl": ["30px", { lineHeight: "36px" }],
      "4xl": ["36px", { lineHeight: "40px" }],
      "5xl": ["48px", { lineHeight: "1" }],
      "6xl": ["60px", { lineHeight: "1" }],
      "7xl": ["72px", { lineHeight: "1" }],
      "8xl": ["96px", { lineHeight: "1" }],
      "9xl": ["128px", { lineHeight: "1" }],
    },

    fontWeights: {
      thin: "100",
      extralight: "200",
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
      black: "900",
    },

    letterSpacing: {
      tighter: "-0.05em",
      tight: "-0.025em",
      normal: "0em",
      wide: "0.025em",
      wider: "0.05em",
      widest: "0.1em",
    },
  },

  // Border Radius Scale
  radii: {
    none: "0px",
    sm: "calc(var(--radius) - 4px)",
    DEFAULT: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    lg: "var(--radius)",
    xl: "calc(var(--radius) + 4px)",
    "2xl": "calc(var(--radius) + 8px)",
    "3xl": "calc(var(--radius) + 12px)",
    full: "9999px",
  },

  // Shadow Scale
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    none: "0 0 #0000",
  },

  // Animation Tokens
  animations: {
    durations: {
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
    },

    easings: {
      linear: "linear",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
} as const

// Type exports for TypeScript support
export type ColorToken = keyof typeof designTokens.colors
export type SpacingToken = keyof typeof designTokens.spacing
export type TypographyToken = keyof typeof designTokens.typography.fontSizes
export type RadiusToken = keyof typeof designTokens.radii
export type ShadowToken = keyof typeof designTokens.shadows

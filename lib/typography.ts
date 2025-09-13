/**
 * Typography System
 * Comprehensive typography utilities and components for News On Africa
 */

// Using system fonts to avoid external fetch during build
export const inter = { className: "", variable: "--font-inter" }
export const playfairDisplay = { className: "", variable: "--font-playfair" }
export const jetbrainsMono = { className: "", variable: "--font-jetbrains" }

// Typography Scale Configuration
export const typographyScale = {
  // Display sizes for hero sections and large headings
  display: {
    "2xl": {
      fontSize: "clamp(3rem, 8vw, 4.5rem)", // 48px - 72px
      lineHeight: "1.1",
      letterSpacing: "-0.025em",
      fontWeight: "800",
    },
    xl: {
      fontSize: "clamp(2.25rem, 6vw, 3.75rem)", // 36px - 60px
      lineHeight: "1.1",
      letterSpacing: "-0.025em",
      fontWeight: "700",
    },
    lg: {
      fontSize: "clamp(1.875rem, 5vw, 3rem)", // 30px - 48px
      lineHeight: "1.2",
      letterSpacing: "-0.025em",
      fontWeight: "700",
    },
  },

  // Heading sizes
  heading: {
    h1: {
      fontSize: "clamp(1.75rem, 4vw, 2.25rem)", // 28px - 36px
      lineHeight: "1.2",
      letterSpacing: "-0.025em",
      fontWeight: "700",
    },
    h2: {
      fontSize: "clamp(1.5rem, 3vw, 1.875rem)", // 24px - 30px
      lineHeight: "1.3",
      letterSpacing: "-0.025em",
      fontWeight: "600",
    },
    h3: {
      fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)", // 20px - 24px
      lineHeight: "1.4",
      letterSpacing: "0em",
      fontWeight: "600",
    },
    h4: {
      fontSize: "clamp(1.125rem, 2vw, 1.25rem)", // 18px - 20px
      lineHeight: "1.4",
      letterSpacing: "0em",
      fontWeight: "600",
    },
    h5: {
      fontSize: "1.125rem", // 18px
      lineHeight: "1.5",
      letterSpacing: "0em",
      fontWeight: "500",
    },
    h6: {
      fontSize: "1rem", // 16px
      lineHeight: "1.5",
      letterSpacing: "0.025em",
      fontWeight: "500",
    },
  },

  // Body text sizes
  body: {
    xl: {
      fontSize: "1.25rem", // 20px
      lineHeight: "1.7",
      letterSpacing: "0em",
      fontWeight: "400",
    },
    lg: {
      fontSize: "1.125rem", // 18px
      lineHeight: "1.7",
      letterSpacing: "0em",
      fontWeight: "400",
    },
    base: {
      fontSize: "1rem", // 16px
      lineHeight: "1.6",
      letterSpacing: "0em",
      fontWeight: "400",
    },
    sm: {
      fontSize: "0.875rem", // 14px
      lineHeight: "1.5",
      letterSpacing: "0.025em",
      fontWeight: "400",
    },
    xs: {
      fontSize: "0.75rem", // 12px
      lineHeight: "1.4",
      letterSpacing: "0.025em",
      fontWeight: "400",
    },
  },

  // Special text styles
  special: {
    lead: {
      fontSize: "clamp(1.125rem, 2vw, 1.25rem)", // 18px - 20px
      lineHeight: "1.7",
      letterSpacing: "0em",
      fontWeight: "400",
      color: "hsl(var(--muted-foreground))",
    },
    caption: {
      fontSize: "0.875rem", // 14px
      lineHeight: "1.4",
      letterSpacing: "0.025em",
      fontWeight: "400",
      color: "hsl(var(--muted-foreground))",
    },
    overline: {
      fontSize: "0.75rem", // 12px
      lineHeight: "1.4",
      letterSpacing: "0.1em",
      fontWeight: "600",
      textTransform: "uppercase" as const,
      color: "hsl(var(--muted-foreground))",
    },
  },
} as const

// Typography Utility Classes
export const typographyClasses = {
  // Font families
  fontSans: "font-sans",
  fontSerif: "font-serif",
  fontMono: "font-mono",

  // Font weights
  fontThin: "font-thin",
  fontLight: "font-light",
  fontNormal: "font-normal",
  fontMedium: "font-medium",
  fontSemibold: "font-semibold",
  fontBold: "font-bold",
  fontExtrabold: "font-extrabold",

  // Text alignment
  textLeft: "text-left",
  textCenter: "text-center",
  textRight: "text-right",
  textJustify: "text-justify",

  // Text decoration
  underline: "underline",
  noUnderline: "no-underline",
  lineThrough: "line-through",

  // Text transform
  uppercase: "uppercase",
  lowercase: "lowercase",
  capitalize: "capitalize",
  normalCase: "normal-case",

  // Text overflow
  truncate: "truncate",
  textEllipsis: "text-ellipsis",
  textClip: "text-clip",

  // Line clamping
  lineClamp1: "line-clamp-1",
  lineClamp2: "line-clamp-2",
  lineClamp3: "line-clamp-3",
  lineClamp4: "line-clamp-4",
  lineClamp5: "line-clamp-5",
  lineClamp6: "line-clamp-6",

  // Text balance for better line breaks
  textBalance: "text-balance",
  textPretty: "text-pretty",
} as const

// Type exports
export type TypographyScale = typeof typographyScale
export type TypographyClasses = typeof typographyClasses

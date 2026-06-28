/**
 * Enhanced Design Tokens for News on Africa
 * 
 * This file extends the existing design tokens with a comprehensive system
 * for scalable, maintainable component development.
 */

// ============================================================================
// SPACING SCALE (8px base unit)
// ============================================================================
export const SPACING = {
  xs: '0.5rem',      // 8px
  sm: '0.75rem',     // 12px
  md: '1rem',        // 16px
  lg: '1.5rem',      // 24px
  xl: '2rem',        // 32px
  '2xl': '2.5rem',   // 40px
  '3xl': '3rem',     // 48px
  '4xl': '4rem',     // 64px
} as const

// ============================================================================
// BORDER RADIUS SCALE
// ============================================================================
export const BORDER_RADIUS = {
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'calc(var(--radius) + 4px)',
  full: '9999px',
} as const

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================
// Display & headings use Archivo (font-display); body uses Source Sans 3.
export const TYPOGRAPHY = {
  // Display - Hero sections (Archivo)
  'display-lg': {
    size: '2.625rem', // up to 64px via clamp
    weight: 800,
    lineHeight: 1.05,
    class: 'font-display display-lg',
  },
  'display-md': {
    size: '2.125rem',
    weight: 700,
    lineHeight: 1.1,
    class: 'font-display display-xl',
  },

  // Headings - Section titles, article headlines (Archivo)
  'heading-lg': {
    size: '1.875rem', // Headline 30
    weight: 700,
    lineHeight: 1.2,
    class: 'font-display heading-lg',
  },
  'heading-md': {
    size: '1.5rem',
    weight: 600,
    lineHeight: 1.25,
    class: 'font-display heading-md',
  },
  'heading-sm': {
    size: '1.25rem', // Card title 20
    weight: 600,
    lineHeight: 1.3,
    class: 'font-display heading-sm',
  },

  // Body - Main content (Source Sans 3)
  'body-lg': {
    size: '1.0625rem', // Body 17
    weight: 400,
    lineHeight: 1.6,
    class: 'body-lg',
  },
  'body-md': {
    size: '0.9375rem',
    weight: 400,
    lineHeight: 1.6,
    class: 'body-md',
  },
  'body-sm': {
    size: '0.8125rem',
    weight: 400,
    lineHeight: 1.55,
    class: 'body-sm',
  },

  // UI - Labels, captions, eyebrows
  'ui-sm': {
    size: '0.75rem', // Eyebrow 12 (uppercase)
    weight: 600,
    lineHeight: 1.4,
    class: 'text-ui-sm font-display font-semibold uppercase tracking-wide',
  },
  'ui-md': {
    size: '0.8125rem',
    weight: 500,
    lineHeight: 1.4,
    class: 'text-ui-md font-medium',
  },
} as const

// ============================================================================
// TRANSITIONS & ANIMATIONS
// ============================================================================
export const TRANSITIONS = {
  fast: '100ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const

export const EASING = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

// ============================================================================
// Z-INDEX SCALE
// ============================================================================
export const Z_INDEX = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 500,
  fixed: 900,
  modal: 1000,
  modalOverlay: 999,
  tooltip: 1100,
  notification: 1200,
} as const

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================
export const BREAKPOINTS = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// ============================================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================================

// Article Card Variants (existing pattern to formalize)
// Uses semantic typography classes for consistency
export const ARTICLE_VARIANTS = {
  featured: {
    headline: 'heading-md md:heading-lg font-semibold leading-snug',
    excerpt: 'body-sm text-muted-foreground/90 md:body-md',
    content: 'gap-4 p-4 md:p-5',
    category: 'text-ui-sm font-semibold uppercase tracking-wide',
  },
  default: {
    headline: 'body-lg md:heading-md font-semibold leading-snug',
    excerpt: 'body-sm text-muted-foreground/90',
    content: 'gap-3 p-4',
    category: 'text-ui-sm font-semibold uppercase tracking-wide',
  },
  compact: {
    headline: 'body-sm md:body-lg font-semibold leading-snug',
    excerpt: 'text-ui-sm text-muted-foreground/80',
    content: 'gap-2.5 p-3 md:p-4',
    category: 'text-ui-sm font-semibold uppercase tracking-wide',
  },
} as const

// Button Size Presets
export const BUTTON_SIZES = {
  xs: {
    padding: 'px-2 py-1',
    fontSize: 'text-xs',
    height: 'h-7',
  },
  sm: {
    padding: 'px-3 py-1.5',
    fontSize: 'text-sm',
    height: 'h-8',
  },
  md: {
    padding: 'px-4 py-2',
    fontSize: 'text-base',
    height: 'h-10',
  },
  lg: {
    padding: 'px-6 py-2.5',
    fontSize: 'text-base',
    height: 'h-12',
  },
  xl: {
    padding: 'px-8 py-3',
    fontSize: 'text-lg',
    height: 'h-14',
  },
} as const

// Elevation / Shadows
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const

// ============================================================================
// SEMANTIC COLOR REFERENCE (defined in globals.css)
// ============================================================================
export const COLOR_REFERENCE = {
  light: {
    primary: '#15994A',        // Green 600 - brand, links, primary actions
    cta: '#1BB257',            // Green 500 - calls to action
    secondary: 'hsl(40 13% 94%)', // Warm light grey - secondary UI
    success: '#15994A',        // Green - success states
    warning: '#A9791A',        // Gold - warning / sponsored
    info: '#1E6FD6',           // Blue - info / link states
    destructive: '#D62828',    // Red - destructive / live / breaking
    background: '#FAFAF9',     // Surface - warm paper
    foreground: '#161412',     // Ink
    border: '#ECEAE7',         // Hairline
    muted: 'hsl(40 13% 94%)',  // Warm muted surface
    mutedForeground: '#6E6A66',// Muted text
  },
  // Brand green scale
  green: {
    50: '#E8F6EE',  // Tint
    200: '#A6E2BE',
    500: '#1BB257', // CTA
    600: '#15994A', // Primary
    900: '#0B5E2D',
  },
  // Functional — used sparingly, never decorative
  functional: {
    live: '#D62828',       // Breaking / live
    sponsored: '#A9791A',  // Sponsored (gold)
    adSurface: '#F2F1EE',  // Ad surface
    adText: '#8A8A8A',     // Ad label text
    info: '#1E6FD6',       // Info / link
  },
} as const

// ============================================================================
// ACCESSIBILITY CONSTANTS
// ============================================================================
export const A11Y = {
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
  srOnly: 'sr-only',
  ariaLive: 'polite' as const,
} as const

// ============================================================================
// MOTION-SAFE UTILITIES
// ============================================================================
export const MOTION_SAFE = {
  transition: 'motion-reduce:transition-none',
  transform: 'motion-reduce:transform-none motion-reduce:transition-none',
  animation: 'motion-reduce:animate-none',
} as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
export type Spacing = keyof typeof SPACING
export type BorderRadius = keyof typeof BORDER_RADIUS
export type ArticleVariant = keyof typeof ARTICLE_VARIANTS
export type ButtonSize = keyof typeof BUTTON_SIZES
export type Transition = keyof typeof TRANSITIONS
export type Breakpoint = keyof typeof BREAKPOINTS
export type ZIndex = keyof typeof Z_INDEX

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ComponentState = 'default' | 'hover' | 'active' | 'disabled' | 'loading'

// ============================================================================
// EXPORT NAMESPACE
// ============================================================================
export const DESIGN_TOKENS = {
  SPACING,
  BORDER_RADIUS,
  TYPOGRAPHY,
  TRANSITIONS,
  EASING,
  Z_INDEX,
  BREAKPOINTS,
  ARTICLE_VARIANTS,
  BUTTON_SIZES,
  SHADOWS,
  COLOR_REFERENCE,
  MOTION_SAFE,
  A11Y,
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compose responsive Tailwind classes
 * @example getResponsiveClasses({ base: 'block', md: 'hidden', lg: 'block' })
 */
export function getResponsiveClasses(values: {
  base?: string
  sm?: string
  md?: string
  lg?: string
  xl?: string
  '2xl'?: string
}): string {
  const classes: string[] = []
  if (values.base) classes.push(values.base)
  if (values.sm) classes.push(`sm:${values.sm}`)
  if (values.md) classes.push(`md:${values.md}`)
  if (values.lg) classes.push(`lg:${values.lg}`)
  if (values.xl) classes.push(`xl:${values.xl}`)
  if (values['2xl']) classes.push(`2xl:${values['2xl']}`)
  return classes.join(' ')
}

/**
 * Get button size classes
 * @example getButtonSize('md')
 */
export function getButtonSize(size: ButtonSize = 'md'): string {
  const sizeConfig = BUTTON_SIZES[size]
  return `${sizeConfig.padding} ${sizeConfig.fontSize} ${sizeConfig.height}`
}

/**
 * Get article variant styles
 * @example getArticleVariant('featured')
 */
export function getArticleVariant(variant: ArticleVariant = 'default'): typeof ARTICLE_VARIANTS[ArticleVariant] {
  return ARTICLE_VARIANTS[variant]
}

// ============================================================================
// DESIGN SYSTEM USAGE GUIDE
// ============================================================================
/**
 * TYPOGRAPHY HIERARCHY
 * 
 * Display Sizes (Hero/Landing):
 * - Use: display-2xl, display-xl, display-lg
 * - Example: <Heading size="2xl">Main Hero Title</Heading>
 * 
 * Heading Sizes (Page/Section Titles):
 * - Use: heading-lg (h1), heading-md (h2), heading-sm (h3)
 * - Semantic: Always use correct heading level for accessibility
 * - Example: <Heading level="h1" size="lg">Page Title</Heading>
 * 
 * Body Text (Content):
 * - Use: body-lg, body-md, body-sm
 * - Line height: 1.6 (relaxed) for comfortable reading
 * - Example: <Text size="base">Article content here</Text>
 * 
 * UI Text (Labels, Captions):
 * - Use: ui-md, ui-sm
 * - Font weight: 500 (medium) for emphasis
 * - Example: <Text size="xs" weight="semibold">Label</Text>
 * 
 * COLOR USAGE
 * 
 * Primary Colors:
 * - Primary: Green (142.1 76.2% 36.3%) - CTAs, active states
 * - Destructive: Red (0 84.2% 60.2%) - Warnings, delete actions
 * - Success: Green shades - Positive feedback
 * 
 * Semantic Colors:
 * - text-foreground: Main text (dark on light)
 * - text-muted-foreground: Secondary text, disabled states
 * - bg-card: Card backgrounds
 * - bg-muted: Disabled, secondary backgrounds
 * 
 * NEVER use hard-coded colors:
 * ❌ DON'T: bg-gray-100, text-blue-600, border-gray-300
 * ✅ DO: bg-muted, text-primary, border-border
 * 
 * SPACING & LAYOUT
 * 
 * Spacing Scale (8px base):
 * - xs: 8px (0.5rem)
 * - sm: 12px (0.75rem)
 * - md: 16px (1rem)
 * - lg: 24px (1.5rem)
 * - xl: 32px (2rem)
 * 
 * Use gap for flex layouts, p-* for padding:
 * ❌ DON'T: <div style={{ marginRight: '12px' }}>
 * ✅ DO: <div className="gap-3"> or <div className="mr-3">
 * 
 * Border Radius:
 * - sm: calc(var(--radius) - 4px) ≈ 2px
 * - md: calc(var(--radius) - 2px) ≈ 4px
 * - lg: var(--radius) ≈ 6px
 * - full: 9999px (for pills/circles)
 * 
 * RESPONSIVE DESIGN
 * 
 * Mobile-first approach:
 * 1. Define base styles for mobile
 * 2. Add breakpoint prefixes for larger screens
 * 3. Common breakpoints: sm:640px, md:768px, lg:1024px, xl:1280px
 * 
 * Example:
 * ❌ DON'T: text-lg sm:text-base (backwards)
 * ✅ DO: text-sm md:text-base lg:text-lg (progressive enhancement)
 * 
 * COMPONENT PATTERNS
 * 
 * Article Cards:
 * - Use getArticleVariant('featured'|'default'|'compact')
 * - Variants provide consistent headline, excerpt, and content spacing
 * - Don't create custom type styles for articles
 * 
 * Form Elements:
 * - Heading + Text patterns for labels/descriptions
 * - Use focus-ring utility for consistent focus states
 * - Button sizes: sm, default, lg, xl (use BUTTON_SIZES)
 * 
 * Accessibility (A11Y)
 * - Always use semantic HTML: <h1>, <h2>, etc.
 * - Include aria-labels for icons
 * - Use focus-ring utility on interactive elements
 * - Test with keyboard navigation
 * - Use sr-only class for screen reader text
 * 
 * TESTING CHANGES
 * 
 * When modifying styles:
 * 1. Check mobile (320px), tablet (768px), desktop (1280px)
 * 2. Test color contrast on light/dark backgrounds
 * 3. Verify text is readable at all sizes
 * 4. Check hover/focus states work correctly
 * 5. Ensure no hard-coded colors remain
 */

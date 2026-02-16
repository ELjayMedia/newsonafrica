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
export const TYPOGRAPHY = {
  // Display - Hero sections
  'display-lg': {
    size: '2.25rem',
    weight: 700,
    lineHeight: 1.2,
    class: 'text-3xl font-bold leading-tight',
  },
  'display-md': {
    size: '1.875rem',
    weight: 700,
    lineHeight: 1.2,
    class: 'text-2xl font-bold leading-tight',
  },

  // Headings - Section titles, article headlines
  'heading-lg': {
    size: '1.5rem',
    weight: 600,
    lineHeight: 1.4,
    class: 'text-xl font-semibold leading-snug',
  },
  'heading-md': {
    size: '1.25rem',
    weight: 600,
    lineHeight: 1.4,
    class: 'text-lg font-semibold leading-snug',
  },
  'heading-sm': {
    size: '1.125rem',
    weight: 600,
    lineHeight: 1.4,
    class: 'text-base font-semibold leading-snug',
  },

  // Body - Main content
  'body-lg': {
    size: '1rem',
    weight: 400,
    lineHeight: 1.6,
    class: 'text-base leading-relaxed',
  },
  'body-md': {
    size: '0.9375rem',
    weight: 400,
    lineHeight: 1.6,
    class: 'text-sm leading-relaxed',
  },
  'body-sm': {
    size: '0.875rem',
    weight: 400,
    lineHeight: 1.6,
    class: 'text-xs leading-relaxed',
  },

  // UI - Labels, captions
  'ui-sm': {
    size: '0.75rem',
    weight: 500,
    lineHeight: 1.4,
    class: 'text-xs font-medium',
  },
  'ui-md': {
    size: '0.875rem',
    weight: 500,
    lineHeight: 1.4,
    class: 'text-sm font-medium',
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
export const ARTICLE_VARIANTS = {
  featured: {
    headline: 'text-lg font-semibold leading-tight md:text-xl',
    excerpt: 'text-sm text-muted-foreground/90 md:text-base',
    content: 'gap-4 p-4 md:p-5',
    category: 'text-[11px]',
  },
  default: {
    headline: 'text-base font-semibold leading-snug md:text-lg',
    excerpt: 'text-sm text-muted-foreground/90',
    content: 'gap-3 p-4',
    category: 'text-[10px]',
  },
  compact: {
    headline: 'text-sm font-semibold leading-snug md:text-base',
    excerpt: 'text-xs text-muted-foreground/80',
    content: 'gap-2.5 p-3 md:p-4',
    category: 'text-[10px]',
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
    primary: 'hsl(142.1 76.2% 36.3%)',      // Green - primary actions
    secondary: 'hsl(240 4.8% 95.9%)',       // Light gray - secondary UI
    success: 'hsl(142 76% 36%)',            // Green - success states
    warning: 'hsl(38 92% 50%)',             // Amber - warning states
    info: 'hsl(217 91% 60%)',               // Blue - info states
    destructive: 'hsl(0 84.2% 60.2%)',      // Red - destructive actions
    background: 'hsl(0 0% 100%)',           // White
    foreground: 'hsl(240 10% 3.9%)',        // Dark charcoal
    border: 'hsl(240 5.9% 90%)',
    muted: 'hsl(240 4.8% 95.9%)',
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

export const designTokens = {
  // Colors - using CSS variables for theme consistency
  colors: {
    // Background colors
    background: 'bg-background',
    card: 'bg-card',
    surface: 'bg-white dark:bg-gray-800',

    // Text colors
    text: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
      accent: 'text-blue-600 dark:text-blue-400',
      muted: 'text-gray-500 dark:text-gray-400',
      inverse: 'text-white',
    },

    // Brand colors
    brand: {
      primary: 'bg-blue-600 text-white',
      primaryText: 'text-blue-600',
      primaryHover: 'hover:bg-blue-700',
      accent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    },

    // State colors
    states: {
      hover: 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
      focus: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      active: 'active:bg-gray-100 dark:active:bg-gray-600',
    },
  },

  // Typography scale
  typography: {
    // Headlines
    headline: {
      large: 'text-lg font-semibold leading-tight',
      medium: 'text-base font-semibold leading-snug',
      small: 'text-sm font-semibold leading-tight',
      micro: 'text-xs font-medium leading-tight',
    },

    // Body text
    body: {
      large: 'text-base leading-relaxed',
      medium: 'text-sm leading-normal',
      small: 'text-xs leading-normal',
    },

    // Meta text
    meta: {
      primary: 'text-xs text-muted-foreground',
      accent: 'text-xs font-medium text-blue-600',
      muted: 'text-xs text-gray-400',
    },

    // Special text styles
    special: {
      uppercase: 'text-xs font-medium tracking-wide uppercase',
      number: 'text-lg font-bold text-gray-300 dark:text-gray-600',
    },
  },

  // Spacing system
  spacing: {
    // Padding
    padding: {
      none: 'p-0',
      xs: 'p-1',
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
      xl: 'p-6',
    },

    // Margins
    margin: {
      none: 'm-0',
      xs: 'm-1',
      sm: 'm-2',
      md: 'm-3',
      lg: 'm-4',
      xl: 'm-6',
    },

    // Gaps
    gap: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-6',
    },
  },

  // Border radius
  radius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  },

  // Shadows
  shadows: {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    hover: 'hover:shadow-md',
    focus: 'focus:shadow-lg',
  },

  // Borders
  borders: {
    none: 'border-0',
    base: 'border border-border',
    subtle: 'border border-gray-100 dark:border-gray-800',
    accent: 'border-l-4 border-blue-600',
  },

  // Layout utilities
  layout: {
    // Flexbox
    flex: {
      row: 'flex flex-row',
      col: 'flex flex-col',
      center: 'flex items-center justify-center',
      between: 'flex items-center justify-between',
      start: 'flex items-center justify-start',
    },

    // Grid
    grid: {
      cols1: 'grid grid-cols-1',
      cols2: 'grid grid-cols-2',
      cols3: 'grid grid-cols-3',
      responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    },

    // Positioning
    position: {
      relative: 'relative',
      absolute: 'absolute',
      fixed: 'fixed',
      sticky: 'sticky',
    },
  },

  // Transitions
  transitions: {
    base: 'transition-all duration-200 ease-in-out',
    fast: 'transition-all duration-150 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
    transform: 'transition-transform duration-200 ease-in-out',
    colors: 'transition-colors duration-200 ease-in-out',
  },

  // Component-specific tokens
  components: {
    card: {
      base: 'bg-card border border-border rounded-lg shadow-sm',
      hover: 'hover:shadow-md transition-shadow duration-200',
      interactive:
        'bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer',
    },

    button: {
      primary:
        'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      secondary:
        'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
    },

    input: {
      base: 'border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2',
    },
  },
};

// Utility function to combine token classes
export function combineTokens(...tokens: string[]): string {
  return tokens.filter(Boolean).join(' ');
}

// Pre-built component style combinations
export const componentStyles = {
  // Card variants
  cardBase: combineTokens(designTokens.components.card.base, designTokens.transitions.base),

  cardInteractive: combineTokens(
    designTokens.components.card.interactive,
    designTokens.colors.states.focus,
  ),

  // Sidebar widget
  sidebarWidget: combineTokens(
    designTokens.colors.card,
    designTokens.borders.subtle,
    designTokens.radius.lg,
    designTokens.shadows.sm,
  ),

  // Headlines
  headlinePrimary: combineTokens(
    designTokens.typography.headline.medium,
    designTokens.colors.text.primary,
    'line-clamp-2',
  ),

  headlineSecondary: combineTokens(
    designTokens.typography.headline.small,
    designTokens.colors.text.primary,
    'line-clamp-2',
  ),

  // Meta information
  metaInfo: combineTokens(
    designTokens.typography.meta.primary,
    designTokens.layout.flex.start,
    designTokens.spacing.gap.xs,
  ),

  // Image containers
  imageContainer: combineTokens(
    designTokens.layout.position.relative,
    'overflow-hidden',
    designTokens.radius.md,
  ),

  // Links
  linkBase: combineTokens(
    'hover:underline focus:underline focus:outline-none',
    designTokens.colors.text.primary,
    designTokens.transitions.colors,
  ),
};

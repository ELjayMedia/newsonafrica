/**
 * Grid Utilities
 * Responsive grid system utilities for consistent layouts
 */

export const gridUtilities = {
  // Container utilities
  container: {
    base: "mx-auto px-4 sm:px-6 lg:px-8",
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  },

  // Grid layouts
  grid: {
    // Auto-fit grids
    "auto-fit-xs": "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4",
    "auto-fit-sm": "grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4",
    "auto-fit-md": "grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6",
    "auto-fit-lg": "grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-6",

    // Responsive grids
    "responsive-2": "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6",
    "responsive-3": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6",
    "responsive-4": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6",

    // News/article layouts
    "news-hero": "grid grid-cols-1 lg:grid-cols-3 gap-6",
    "news-featured": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6",
    "news-list": "grid grid-cols-1 gap-4",
    "news-sidebar": "grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8",

    // Card layouts
    "card-grid": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6",
    "card-masonry": "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 md:gap-6",
  },

  // Flexbox utilities
  flex: {
    center: "flex items-center justify-center",
    between: "flex items-center justify-between",
    start: "flex items-center justify-start",
    end: "flex items-center justify-end",
    "col-center": "flex flex-col items-center justify-center",
    "col-start": "flex flex-col items-start justify-start",
    wrap: "flex flex-wrap",
    nowrap: "flex flex-nowrap",
  },

  // Spacing utilities
  spacing: {
    section: "py-12 md:py-16 lg:py-20",
    "section-sm": "py-8 md:py-12",
    "section-lg": "py-16 md:py-20 lg:py-24",
    content: "space-y-6 md:space-y-8",
    "content-sm": "space-y-4 md:space-y-6",
    "content-lg": "space-y-8 md:space-y-12",
  },

  // Responsive utilities
  responsive: {
    "hide-mobile": "hidden md:block",
    "hide-desktop": "block md:hidden",
    "mobile-full": "w-full md:w-auto",
    "desktop-full": "w-auto md:w-full",
  },
} as const

// Utility function to get grid classes
export function getGridClasses(type: keyof typeof gridUtilities.grid) {
  return gridUtilities.grid[type]
}

// Utility function to get container classes
export function getContainerClasses(size: keyof typeof gridUtilities.container = "base") {
  return `${gridUtilities.container.base} ${gridUtilities.container[size]}`
}

// Type exports
export type GridType = keyof typeof gridUtilities.grid
export type ContainerSize = keyof typeof gridUtilities.container
export type FlexType = keyof typeof gridUtilities.flex
export type SpacingType = keyof typeof gridUtilities.spacing

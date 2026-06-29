/**
 * ISR and PPR Configuration
 * Systematic revalidation times for all content types
 */

export const ISR_CONFIG = {
  // Article pages - frequently viewed, medium update frequency
  ARTICLE: 300, // 5 minutes

  // Home pages - high traffic, frequent updates
  HOME: 300, // 5 minutes

  // Category pages - moderate traffic, regular updates
  CATEGORY: 600, // 10 minutes

  // Author pages - lower traffic, infrequent updates
  AUTHOR: 3600, // 1 hour

  // Tag pages - lower traffic, infrequent updates
  TAG: 1800, // 30 minutes

  // Search results - dynamic, short cache
  SEARCH: 60, // 1 minute

  // OpenGraph images - rarely change after generation
  OG_IMAGE: 86400, // 24 hours

  // Static content - very infrequent updates
  STATIC: 86400, // 24 hours
} as const

/**
 * Static generation limits for generateStaticParams
 */
export const STATIC_GENERATION_LIMITS = {
  // Pre-generate top N articles per edition at build time
  ARTICLES_PER_EDITION: 50,

  // Pre-generate all category pages (usually < 20)
  CATEGORIES: Number.POSITIVE_INFINITY,

  // Pre-generate top N author pages
  AUTHORS: 20,

  // Pre-generate top N tag pages
  TAGS: 30,
} as const

/**
 * PPR configuration for selective prerendering
 */
export const PPR_CONFIG = {
  // Enable PPR for article pages (static shell + dynamic comments/bookmarks)
  ARTICLES: true,

  // Enable PPR for home pages (static layout + dynamic personalization)
  HOME: true,

  // Enable PPR for category pages (static list + dynamic pagination)
  CATEGORIES: true,

  // Disable PPR for search (fully dynamic)
  SEARCH: false,

  // Disable PPR for auth pages (fully dynamic)
  AUTH: false,
} as const

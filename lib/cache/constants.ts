export const CACHE_DURATIONS = {
  NONE: 0, // No cache
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 86400, // 24 hours
} as const

export const CACHE_TAGS = {
  HOME: "home",
  HOME_COUNTRY: (countryCode: string) => `home:${countryCode}`,
  EDITION: (countryCode: string) => `edition:${countryCode}`,
  POSTS: "posts",
  POST: (id: string | number) => `post-${id}`,
  CATEGORIES: "categories",
  CATEGORY: (id: string | number) => `category-${id}`,
  AUTHORS: "authors",
  TAGS: "tags",
  COMMENTS: "comments",
  FEATURED: "featured",
  TRENDING: "trending",
  BOOKMARKS: "bookmarks",
  USERS: "users", // Preferences, profile updates, avatar uploads, and auth metadata mutations.
  SUBSCRIPTIONS: "subscriptions", // Subscription mutations and payment webhook handlers.
} as const

export const KV_CACHE_KEYS = {
  HOME_FEED: "kv:home-feed:aggregated:v1",
  LEGACY_POST_ROUTES: "kv:legacy-post-routes",
  HOMEPAGE_DATA: "kv:homepage-data:v1",
} as const

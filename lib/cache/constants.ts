export const CACHE_DURATIONS = {
  NONE: 0, // No cache
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 86400, // 24 hours
} as const

export const CACHE_TAGS = {
  HOME: "home",
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
  USERS: "users",
  SUBSCRIPTIONS: "subscriptions",
} as const

export const KV_CACHE_KEYS = {
  HOME_FEED: "kv:home-feed:aggregated:v1",
} as const

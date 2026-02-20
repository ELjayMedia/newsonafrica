import { getRestBase } from "@/lib/wp-endpoints"
import { ENV } from "@/config/env"

const rest = getRestBase()
const baseUrl = rest.replace(/\/wp-json\/wp\/v2$/, "")

export const appConfig = {
  // WordPress API Configuration
  wordpress: {
    baseUrl,
    restEndpoint: rest,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    restMaxPerPage: 100,
    defaultPageSize: 100,
    requestThrottleMs: 150,
    graphqlBatchSize: 100,
  },

  // Supported African Countries
  countries: {
    supported: ["sz", "za"],
    default: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz",
    fallbacks: {
      sz: ["za"],
      za: ["sz"],
    },
  },

  // Content Configuration
  content: {
    postsPerPage: 20,
    relatedPostsCount: 6,
    relatedPostsTimeoutMs: 1000,
    excerptLength: 150,
    categories: ["news", "business", "sport", "entertainment", "life", "health", "politics", "food", "opinion"],
    fpTagSlug: "fp" as const,
  },

  // Performance Configuration
  performance: {
    imageOptimization: true,
    lazyLoading: true,
    prefetchLinks: true,
    cacheTimeout: 300000, // 5 minutes
  },

  // Front Page Configuration
  frontPage: {
    heroLimit: 8,
    heroFallbackLimit: 3,
    trendingLimit: 7,
    latestLimit: 20,
    heroTags: ["fp"] as const,
  },

  // Home Page Configuration
  home: {
    limits: {
      featured: 6,
      tagged: 8,
      recent: 10,
      fallback: 6,
      categoryPosts: 5,
    },
    timeouts: {
      frontPage: 12000,
      recent: 8000,
      tag: 8000,
    },
    concurrency: 4,
    editions: {
      african: { code: "AF", name: "African Edition" },
    },
    defaultTagsByCountry: {} as Record<string, string>,
  },

  // Comments Configuration
  comments: {
    pageSize: 100,
    rateLimitSeconds: 10,
  },

  // Search Configuration
  search: {
    resultsPerPage: 12,
    cacheDurationMs: 5 * 60 * 1000, // 5 minutes
  },

  // Bookmarks Configuration
  bookmarks: {
    defaultCollectionSlug: "general",
    defaultCollectionName: "Saved Articles",
    defaultCollectionDescription: "Articles saved outside a specific edition",
  },

  // Auth Configuration
  auth: {
    sessionCookieName: "sess",
    sessionCookieTtlMs: 5 * 60 * 1000, // 5 minutes before considered stale
    sessionCookieMaxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
    sessionRefreshBufferMs: 5 * 60 * 1000, // 5 minutes
  },

  // UI Configuration
  ui: {
    mobileBreakpoint: 768,
    toastLimit: 1,
    toastRemoveDelay: 1000000,
    sidebar: {
      cookieName: "sidebar:state",
      cookieMaxAge: 60 * 60 * 24 * 7,
      width: "16rem",
      widthMobile: "18rem",
      widthIcon: "3rem",
      keyboardShortcut: "b",
    },
  },

  // Sitemap Configuration
  sitemap: {
    recentPostLimit: 100,
  },

  // Feature Flags
  features: {
    comments: process.env.FEATURE_COMMENTS === "true",
    bookmarks: process.env.FEATURE_BOOKMARKS === "true",
    subscriptions: process.env.FEATURE_SUBSCRIPTIONS === "true",
    advancedSearch: process.env.FEATURE_ADVANCED_SEARCH === "true",
    // These features were not implemented in the codebase
    // i18n: process.env.FEATURE_I18N === "true",
    // aiRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === "true",
    // aiContent: process.env.FEATURE_AI_CONTENT === "true",
  },

  // SEO Configuration
  seo: {
    defaultTitle: "News On Africa - Pan-African News Platform",
    titleTemplate: "%s | News On Africa",
    defaultDescription: "Your trusted source for news across Africa with local relevance and continental context.",
    siteUrl: ENV.NEXT_PUBLIC_SITE_URL,
    twitterHandle: "@newsonafrica",
    facebookAppId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
  },
} as const

export type AppConfig = typeof appConfig

import { getWpEndpoints } from "@/config/wp"

const { rest } = getWpEndpoints()
const baseUrl = rest.replace(/\/wp-json\/wp\/v2$/, "")

export const appConfig = {
  // WordPress API Configuration
  wordpress: {
    baseUrl,
    restEndpoint: rest,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
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
    excerptLength: 150,
    categories: ["news", "business", "sport", "entertainment", "life", "health", "politics", "food", "opinion"],
  },

  // Performance Configuration
  performance: {
    imageOptimization: true,
    lazyLoading: true,
    prefetchLinks: true,
    cacheTimeout: 300000, // 5 minutes
  },

  // PWA Configuration
  pwa: {
    installPromptDelay: 3000,
    updateCheckInterval: 60000, // 1 minute
    offlinePages: ["/", "/offline"],
  },

  // Feature Flags
  features: {
    comments: process.env.FEATURE_COMMENTS === "true",
    bookmarks: process.env.FEATURE_BOOKMARKS === "true",
    subscriptions: process.env.FEATURE_SUBSCRIPTIONS === "true",
    advancedSearch: process.env.FEATURE_ADVANCED_SEARCH === "true",
    i18n: process.env.FEATURE_I18N === "true",
    aiRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === "true",
    aiContent: process.env.FEATURE_AI_CONTENT === "true",
  },

  // SEO Configuration
  seo: {
    defaultTitle: "News On Africa - Pan-African News Platform",
    titleTemplate: "%s | News On Africa",
    defaultDescription: "Your trusted source for news across Africa with local relevance and continental context.",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://app.newsonafrica.com",
    twitterHandle: "@newsonafrica",
    facebookAppId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
  },

} as const

export type AppConfig = typeof appConfig

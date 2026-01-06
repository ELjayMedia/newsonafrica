import { z } from "zod"

const ConfigSchema = z.object({
  // Environment & Site
  site: z.object({
    url: z.string().url(),
    name: z.string(),
    description: z.string(),
    defaultCountry: z.string().length(2),
  }),

  // WordPress
  wordpress: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().positive(),
    retryAttempts: z.number().int().positive(),
    retryDelay: z.number().positive(),
    authHeaders: z.record(z.string()).optional(),
  }),

  // Editions
  editions: z.object({
    supported: z.array(z.string().length(2)),
    fallbacks: z.record(z.array(z.string().length(2))),
  }),

  // Content
  content: z.object({
    postsPerPage: z.number().int().positive(),
    relatedPostsCount: z.number().int().positive(),
    excerptLength: z.number().int().positive(),
    categories: z.array(z.string()),
  }),

  // Features
  features: z.object({
    comments: z.boolean(),
    bookmarks: z.boolean(),
    subscriptions: z.boolean(),
    advancedSearch: z.boolean(),
  }),

  // Supabase
  supabase: z.object({
    url: z.string().url(),
    anonKey: z.string().min(1),
    serviceRoleKey: z.string().min(1).optional(),
  }),

  // Paystack
  paystack: z.object({
    publicKey: z.string().min(1),
    secretKey: z.string().min(1).optional(),
  }),

  // Performance
  performance: z.object({
    imageOptimization: z.boolean(),
    lazyLoading: z.boolean(),
    prefetchLinks: z.boolean(),
    cacheTimeout: z.number().positive(),
  }),

  // SEO
  seo: z.object({
    defaultTitle: z.string(),
    titleTemplate: z.string(),
    defaultDescription: z.string(),
    twitterHandle: z.string().optional(),
    facebookAppId: z.string().optional(),
  }),
})

export type AppConfig = z.infer<typeof ConfigSchema>

function buildConfig(): AppConfig {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.newsonafrica.com"
  const defaultCountry = process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz"

  // WordPress auth headers parsing
  let authHeaders: Record<string, string> | undefined
  const authHeaderEnv = process.env.WORDPRESS_GRAPHQL_AUTH_HEADER
  if (authHeaderEnv) {
    try {
      authHeaders = authHeaderEnv.startsWith("{") ? JSON.parse(authHeaderEnv) : { Authorization: authHeaderEnv }
    } catch (e) {
      console.error("[v0] Failed to parse WORDPRESS_GRAPHQL_AUTH_HEADER:", e)
    }
  }

  return {
    site: {
      url: siteUrl,
      name: "News On Africa",
      description: "Your trusted source for news across Africa with local relevance and continental context.",
      defaultCountry,
    },

    wordpress: {
      baseUrl: "https://newsonafrica.com",
      timeout: Number(process.env.WORDPRESS_REQUEST_TIMEOUT_MS) || 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      authHeaders,
    },

    editions: {
      supported: ["sz", "za", "ng", "ke", "tz", "eg", "gh"],
      fallbacks: {
        sz: ["za"],
        za: ["sz"],
        ng: ["ke"],
        ke: ["ng"],
      },
    },

    content: {
      postsPerPage: 20,
      relatedPostsCount: 6,
      excerptLength: 150,
      categories: ["news", "business", "sport", "entertainment", "life", "health", "politics", "food", "opinion"],
    },

    features: {
      comments: process.env.FEATURE_COMMENTS === "true",
      bookmarks: process.env.FEATURE_BOOKMARKS === "true",
      subscriptions: process.env.FEATURE_SUBSCRIPTIONS === "true",
      advancedSearch: process.env.FEATURE_ADVANCED_SEARCH === "true",
    },

    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },

    paystack: {
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
      secretKey: process.env.PAYSTACK_SECRET_KEY,
    },

    performance: {
      imageOptimization: true,
      lazyLoading: true,
      prefetchLinks: true,
      cacheTimeout: 300000, // 5 minutes
    },

    seo: {
      defaultTitle: "News On Africa - Pan-African News Platform",
      titleTemplate: "%s | News On Africa",
      defaultDescription: "Your trusted source for news across Africa with local relevance and continental context.",
      twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || "@newsonafrica",
      facebookAppId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
    },
  }
}

let config: AppConfig

try {
  const rawConfig = buildConfig()
  config = ConfigSchema.parse(rawConfig)
  Object.freeze(config)
  console.log("[v0] Configuration validated successfully")
} catch (error) {
  console.error("[v0] Configuration validation failed:", error)
  throw new Error("Invalid application configuration. Check environment variables.")
}

export { config }

export const getConfig = () => config
export const getSiteUrl = () => config.site.url
export const getDefaultCountry = () => config.site.defaultCountry
export const getWordPressUrl = () => config.wordpress.baseUrl
export const getSupabaseUrl = () => config.supabase.url
export const getSupabaseAnonKey = () => config.supabase.anonKey
export const isFeatureEnabled = (feature: keyof AppConfig["features"]) => config.features[feature]

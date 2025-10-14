import { z } from "zod"

const DEFAULT_SITE_URL = "http://app.newsonafrica.com"

const envSchema = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.string().default(DEFAULT_SITE_URL),
    NEXT_PUBLIC_DEFAULT_SITE: z.string().default("sz"),
    NEXT_PUBLIC_WP_SZ_GRAPHQL: z.string().optional(),
    NEXT_PUBLIC_WP_SZ_REST_BASE: z.string().optional(),
    NEXT_PUBLIC_WP_ZA_GRAPHQL: z.string().optional(),
    NEXT_PUBLIC_WP_ZA_REST_BASE: z.string().optional(),
    MVP_MODE: z.string().default("0"),
    ANALYTICS_API_BASE_URL: z.string().default("https://newsonafrica.com/api/analytics"),
    ALGOLIA_APP_ID: z.string().optional(),
    ALGOLIA_ADMIN_KEY: z.string().optional(),
    ALGOLIA_SEARCH_API_KEY: z.string().optional(),
    ALGOLIA_INDEX_PREFIX: z.string().default("newsonafrica"),
    WORDPRESS_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(30000),
  })
  .catchall(z.string().optional())

let env: z.infer<typeof envSchema>

try {
  env = envSchema.parse(process.env)
} catch (error) {
  console.error("⚠️ Environment variable validation failed, using defaults:", error)
  // Provide safe defaults if validation fails
  env = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
    NEXT_PUBLIC_DEFAULT_SITE: process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz",
    NEXT_PUBLIC_WP_SZ_GRAPHQL: process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL,
    NEXT_PUBLIC_WP_SZ_REST_BASE: process.env.NEXT_PUBLIC_WP_SZ_REST_BASE,
    NEXT_PUBLIC_WP_ZA_GRAPHQL: process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL,
    NEXT_PUBLIC_WP_ZA_REST_BASE: process.env.NEXT_PUBLIC_WP_ZA_REST_BASE,
    MVP_MODE: process.env.MVP_MODE || "0",
    ANALYTICS_API_BASE_URL:
      process.env.ANALYTICS_API_BASE_URL || "https://newsonafrica.com/api/analytics",
    ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID,
    ALGOLIA_ADMIN_KEY: process.env.ALGOLIA_ADMIN_KEY,
    ALGOLIA_SEARCH_API_KEY: process.env.ALGOLIA_SEARCH_API_KEY,
    ALGOLIA_INDEX_PREFIX: process.env.ALGOLIA_INDEX_PREFIX || "newsonafrica",
    WORDPRESS_REQUEST_TIMEOUT_MS: Number(process.env.WORDPRESS_REQUEST_TIMEOUT_MS) || 30000,
  }
}

export { env }

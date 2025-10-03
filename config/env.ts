import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_SITE: z.string().default("sz"),
  NEXT_PUBLIC_WP_GRAPHQL: z.string().optional(),
  NEXT_PUBLIC_WP_REST_BASE: z.string().optional(),
  NEXT_PUBLIC_WORDPRESS_API_URL: z.string().optional(),
  WORDPRESS_REST_API_URL: z.string().optional(),
  WORDPRESS_AUTH_TOKEN: z.string().optional(),
  WP_APP_USERNAME: z.string().optional(),
  WP_APP_PASSWORD: z.string().optional(),
  ANALYTICS_API_BASE_URL: z.string().default("https://newsonafrica.com/api/analytics"),
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_ADMIN_KEY: z.string().optional(),
  ALGOLIA_SEARCH_API_KEY: z.string().optional(),
  ALGOLIA_INDEX_PREFIX: z.string().default("newsonafrica"),
})

let env: z.infer<typeof envSchema>

try {
  env = envSchema.parse(process.env)
} catch (error) {
  console.error("⚠️ Environment variable validation failed, using defaults:", error)
  // Provide safe defaults if validation fails
  env = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    NEXT_PUBLIC_DEFAULT_SITE: process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz",
    NEXT_PUBLIC_WP_GRAPHQL: process.env.NEXT_PUBLIC_WP_GRAPHQL || process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
    NEXT_PUBLIC_WP_REST_BASE: process.env.NEXT_PUBLIC_WP_REST_BASE || process.env.WORDPRESS_REST_API_URL,
    NEXT_PUBLIC_WORDPRESS_API_URL: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
    WORDPRESS_REST_API_URL: process.env.WORDPRESS_REST_API_URL,
    WORDPRESS_AUTH_TOKEN: process.env.WORDPRESS_AUTH_TOKEN,
    WP_APP_USERNAME: process.env.WP_APP_USERNAME,
    WP_APP_PASSWORD: process.env.WP_APP_PASSWORD,
    ANALYTICS_API_BASE_URL:
      process.env.ANALYTICS_API_BASE_URL || "https://newsonafrica.com/api/analytics",
    ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID,
    ALGOLIA_ADMIN_KEY: process.env.ALGOLIA_ADMIN_KEY,
    ALGOLIA_SEARCH_API_KEY: process.env.ALGOLIA_SEARCH_API_KEY,
    ALGOLIA_INDEX_PREFIX: process.env.ALGOLIA_INDEX_PREFIX || "newsonafrica",
  }
}

export { env }

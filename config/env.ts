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
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
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
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  }
}

export { env }

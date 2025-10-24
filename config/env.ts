import { z } from "zod"

const DEFAULT_SITE_URL = "http://app.newsonafrica.com"

const envSchema = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.string().default(DEFAULT_SITE_URL),
    NEXT_PUBLIC_DEFAULT_SITE: z.string().default("sz"),
    NEXT_PUBLIC_WP_SZ_GRAPHQL: z.string().optional(),
    NEXT_PUBLIC_WP_ZA_GRAPHQL: z.string().optional(),
    WORDPRESS_AUTH_TOKEN: z.string().optional(),
    ANALYTICS_API_BASE_URL: z.string().default("https://newsonafrica.com/api/analytics"),
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
  const fallbackEnv: Record<string, string | undefined> = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
    NEXT_PUBLIC_DEFAULT_SITE: process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz",
    NEXT_PUBLIC_WP_SZ_GRAPHQL: process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL,
    NEXT_PUBLIC_WP_ZA_GRAPHQL: process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL,
    WORDPRESS_AUTH_TOKEN: process.env.WORDPRESS_AUTH_TOKEN,
    ANALYTICS_API_BASE_URL:
      process.env.ANALYTICS_API_BASE_URL || "https://newsonafrica.com/api/analytics",
    WORDPRESS_REQUEST_TIMEOUT_MS: process.env.WORDPRESS_REQUEST_TIMEOUT_MS || "30000",
  }

  env = envSchema.parse(fallbackEnv)
}

export { env }

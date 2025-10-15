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
    WORDPRESS_AUTH_TOKEN: z.string().optional(),
    WP_APP_USERNAME: z.string().optional(),
    WP_APP_PASSWORD: z.string().optional(),
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
    WORDPRESS_AUTH_TOKEN: process.env.WORDPRESS_AUTH_TOKEN,
    WP_APP_USERNAME: process.env.WP_APP_USERNAME,
    WP_APP_PASSWORD: process.env.WP_APP_PASSWORD,
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

export interface WordPressAppCredentials {
  username: string
  password: string
}

function encodeBasicAuth(username: string, password: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(`${username}:${password}`, "utf-8").toString("base64")
  }

  if (typeof btoa !== "undefined") {
    return btoa(`${username}:${password}`)
  }

  throw new Error("Unable to encode WordPress credentials to base64 in the current runtime environment.")
}

export function requireWordPressAppCredentials(): WordPressAppCredentials {
  const username = env.WP_APP_USERNAME
  const password = env.WP_APP_PASSWORD

  const missing: string[] = []

  if (!username) {
    missing.push("WP_APP_USERNAME")
  }

  if (!password) {
    missing.push("WP_APP_PASSWORD")
  }

  if (missing.length > 0) {
    const suffix = missing.length > 1 ? "s" : ""
    throw new Error(
      `Missing WordPress application credential${suffix}: ${missing.join(", ")} must be configured as environment variables to enable authenticated WordPress requests.`,
    )
  }

  return { username, password }
}

export function getWordPressBasicAuthHeader(): string {
  const { username, password } = requireWordPressAppCredentials()
  return `Basic ${encodeBasicAuth(username, password)}`
}

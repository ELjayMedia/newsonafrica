import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_WORDPRESS_API_URL: z.string().default("https://newsonafrica.com/sz/graphql"),
  WORDPRESS_REST_API_URL: z.string().optional(),
  WORDPRESS_AUTH_TOKEN: z.string().optional(),
  WP_APP_USERNAME: z.string().optional(),
  WP_APP_PASSWORD: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_SITE: z.string().default("sz"),
})

let env: z.infer<typeof envSchema>

try {
  env = envSchema.parse(process.env)
} catch (error) {
  console.error("⚠️ Environment variable validation failed, using defaults:", error)
  // Provide safe defaults if validation fails
  env = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    NEXT_PUBLIC_WORDPRESS_API_URL: process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://newsonafrica.com/sz/graphql",
    WORDPRESS_REST_API_URL: process.env.WORDPRESS_REST_API_URL,
    WORDPRESS_AUTH_TOKEN: process.env.WORDPRESS_AUTH_TOKEN,
    WP_APP_USERNAME: process.env.WP_APP_USERNAME,
    WP_APP_PASSWORD: process.env.WP_APP_PASSWORD,
    NEXT_PUBLIC_DEFAULT_SITE: process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz",
  }
}

export { env }

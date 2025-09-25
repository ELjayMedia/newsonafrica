import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_WORDPRESS_API_URL: z.string().url().optional(),
  WORDPRESS_REST_API_URL: z.string().url().optional(),
  WORDPRESS_AUTH_TOKEN: z.string().optional(),
  WP_APP_USERNAME: z.string().optional(),
  WP_APP_PASSWORD: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_SITE: z.string().default("sz"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_ENV: z.string().default("development"),
})

const parsed = envSchema.safeParse(process.env)

const isProd = process.env.NODE_ENV === "production"

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors
  if (isProd) {
    console.error("❌ Invalid environment variables:", errors)
    throw new Error("Invalid environment variables")
  } else {
    console.warn("⚠️ Invalid/missing environment variables (using dev defaults):", errors)
  }
}

const data = parsed.success ? parsed.data : ({} as z.infer<typeof envSchema>)

export const env = {
  NEXT_PUBLIC_SITE_URL: data.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_WORDPRESS_API_URL: data.NEXT_PUBLIC_WORDPRESS_API_URL ?? "https://newsonafrica.com/graphql",
  WORDPRESS_REST_API_URL: data.WORDPRESS_REST_API_URL ?? "https://newsonafrica.com/wp-json/wp/v2",
  WORDPRESS_AUTH_TOKEN: data.WORDPRESS_AUTH_TOKEN,
  WP_APP_USERNAME: data.WP_APP_USERNAME,
  WP_APP_PASSWORD: data.WP_APP_PASSWORD,
  NEXT_PUBLIC_DEFAULT_SITE: data.NEXT_PUBLIC_DEFAULT_SITE ?? "sz",
  NODE_ENV: data.NODE_ENV ?? "development",
  NEXT_PUBLIC_APP_ENV: data.NEXT_PUBLIC_APP_ENV ?? "development",
}

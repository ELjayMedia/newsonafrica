import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://newsonafrica.com"),
  NEXT_PUBLIC_WP_BASE_URL: z
    .string()
    .url({
      message: "NEXT_PUBLIC_WP_BASE_URL must be a valid URL",
    })
    .nonempty({ message: "NEXT_PUBLIC_WP_BASE_URL is required" }),
  NEXT_PUBLIC_DEFAULT_COUNTRY: z.string().min(1).default("sz"),
  WORDPRESS_REST_URL: z
    .string()
    .url()
    .default("https://newsonafrica.com/sz/wp-json/wp/v2"),
  WORDPRESS_AUTH_TOKEN: z.string({ required_error: "WORDPRESS_AUTH_TOKEN is required" }),
  WP_APP_USERNAME: z.string({ required_error: "WP_APP_USERNAME is required" }),
  WP_APP_PASSWORD: z.string({ required_error: "WP_APP_PASSWORD is required" }),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_FACEBOOK_APP_ID: z.string().optional(),
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const formatted = parsed.error.flatten().fieldErrors
  console.error("Invalid environment variables:", formatted)
  const missing = Object.keys(formatted)
    .map((key) => `${key}: ${formatted[key]?.join(', ')}`)
    .join('; ')
  throw new Error(`Invalid or missing environment variables: ${missing}`)
}

if (!process.env.NEXT_PUBLIC_DEFAULT_COUNTRY) {
  console.warn(
    '[env] NEXT_PUBLIC_DEFAULT_COUNTRY is not defined. Falling back to "sz". '
      + 'Set NEXT_PUBLIC_DEFAULT_COUNTRY in your environment.'
  )
}

export const env = parsed.data

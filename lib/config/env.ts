import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_WORDPRESS_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  WORDPRESS_API_URL: z.string().url().optional(),
  WORDPRESS_REST_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_WORDPRESS_REST_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  LINKEDIN_API_KEY: z.string().optional(),
  LINKEDIN_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_APP_ID: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_INDEX_NAME: z.string().optional(),
  ALGOLIA_SEARCH_API_KEY: z.string().optional(),
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  WORDPRESS_AUTH_TOKEN: z.string().optional(),
  WORDPRESS_WEBHOOK_SECRET: z.string().optional(),
  WP_APP_USERNAME: z.string().optional(),
  WP_APP_PASSWORD: z.string().optional(),
  WP_JWT_TOKEN: z.string().optional(),
  REVALIDATION_SECRET: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  CSRF_SECRET: z.string().optional(),
  INCLUDE_RN_WEB: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

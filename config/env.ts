import { z } from "zod"

/**
 * Environment variables for News on Africa (3 editions only)
 * Supports: Eswatini (sz), South Africa (za), Nigeria (ng)
 */
export const ENV_SCHEMA = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.string().url().default("https://newsonafrica.com"),
    NEXT_PUBLIC_WP_SZ_GRAPHQL: z.string().optional(),
    NEXT_PUBLIC_WP_ZA_GRAPHQL: z.string().optional(),
    NEXT_PUBLIC_WP_NG_GRAPHQL: z.string().optional(),
    NEXT_PUBLIC_WP_SZ_REST_BASE: z.string().optional(),
    NEXT_PUBLIC_WP_ZA_REST_BASE: z.string().optional(),
    NEXT_PUBLIC_WP_NG_REST_BASE: z.string().optional(),
    NEXT_PUBLIC_DEFAULT_SITE: z.enum(["sz", "za", "ng"]).default("sz"),
    WORDPRESS_WEBHOOK_SECRET: z.string().optional(),
    REVALIDATION_SECRET: z.string().optional(),
  })
  .passthrough()

export const ENV = Object.freeze(ENV_SCHEMA.parse(process.env))

export type EnvConfig = z.infer<typeof ENV_SCHEMA>

// Export commonly used env variables
export const REVALIDATION_SECRET = ENV.REVALIDATION_SECRET || ""
export const WORDPRESS_WEBHOOK_SECRET = ENV.WORDPRESS_WEBHOOK_SECRET || ""

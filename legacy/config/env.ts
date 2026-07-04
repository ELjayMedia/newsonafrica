import { z } from "zod"

const graphqlEndpoint = (slug: string) =>
  z
    .string()
    .url()
    .optional()
    .refine((val) => !val || val.includes(`/${slug}/graphql`), {
      message: `GraphQL override for ${slug} must include /${slug}/graphql`,
    })

/**
 * Environment variables for News on Africa (3 editions only)
 * Supports: Eswatini (sz), South Africa (za), Nigeria (ng)
 */
export const ENV_SCHEMA = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.string().url().default("https://newsonafrica.com"),
    NEXT_PUBLIC_WP_SZ_GRAPHQL: graphqlEndpoint("sz"),
    NEXT_PUBLIC_WP_ZA_GRAPHQL: graphqlEndpoint("za"),
    NEXT_PUBLIC_WP_NG_GRAPHQL: graphqlEndpoint("ng"),
    NEXT_PUBLIC_WP_SZ_REST_BASE: z.string().optional(),
    NEXT_PUBLIC_WP_ZA_REST_BASE: z.string().optional(),
    NEXT_PUBLIC_WP_NG_REST_BASE: z.string().optional(),
    NEXT_PUBLIC_DEFAULT_SITE: z.enum(["sz", "za", "ng"]).default("sz"),
    WORDPRESS_WEBHOOK_SECRET: z.string().optional(),
    REVALIDATION_SECRET: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    WORDPRESS_GRAPHQL_AUTH_HEADER: z.string().optional(),
    WORDPRESS_REQUEST_TIMEOUT_MS: z.coerce.number().optional(),
  })
  .passthrough()

export const ENV = Object.freeze(ENV_SCHEMA.parse(process.env))

export const WP_AUTH_HEADERS = (() => {
  if (!ENV.WORDPRESS_GRAPHQL_AUTH_HEADER) return undefined
  try {
    const headers = JSON.parse(ENV.WORDPRESS_GRAPHQL_AUTH_HEADER)
    return Object.freeze(
      Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]),
      ),
    )
  } catch (e) {
    throw new Error("WORDPRESS_GRAPHQL_AUTH_HEADER must be valid JSON")
  }
})()

export type EnvConfig = z.infer<typeof ENV_SCHEMA>

// Export commonly used env variables
export const REVALIDATION_SECRET = ENV.REVALIDATION_SECRET || ""
export const WORDPRESS_WEBHOOK_SECRET = ENV.WORDPRESS_WEBHOOK_SECRET || ""
export const CRON_SECRET = ENV.CRON_SECRET || ""

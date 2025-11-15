import { z } from "zod"

const DEFAULT_SITE_URL = "http://app.newsonafrica.com"

const trimToUndefined = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const stringWithDefault = (defaultValue: string) =>
  z
    .preprocess(trimToUndefined, z.string().default(defaultValue))

const positiveIntegerWithDefault = (defaultValue: number) =>
  z.preprocess(
    (value) => {
      const trimmed = trimToUndefined(value)
      if (!trimmed) {
        return undefined
      }

      const parsed = Number.parseInt(trimmed, 10)
      return parsed
    },
    z
      .number({ required_error: "Expected a number" })
      .int({ message: "Expected an integer" })
      .positive({ message: "Expected a positive integer" })
      .default(defaultValue),
  )

const graphQlEndpointOverride = (countryCode: string) =>
  z.preprocess(
    trimToUndefined,
    z
      .string()
      .url({ message: "Expected an absolute GraphQL endpoint URL" })
      .superRefine((value, ctx) => {
        try {
          const url = new URL(value)
          const normalizedPath = url.pathname.replace(/\/+$/, "").toLowerCase()
          const expectedSuffix = `/${countryCode.toLowerCase()}/graphql`

          if (!normalizedPath.endsWith(expectedSuffix)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Expected the GraphQL endpoint to end with "${expectedSuffix}"`,
            })
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Expected a valid GraphQL endpoint URL",
          })
        }
      })
      .optional(),
  )

const restEndpointOverride = (countryCode: string) =>
  z.preprocess(
    trimToUndefined,
    z.string().url({ message: "Expected an absolute REST API base URL" }).optional(),
  )

const WORDPRESS_COUNTRY_CODES = ["sz", "za", "ng", "ke", "tz", "eg", "gh"] as const

const baseEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: stringWithDefault(DEFAULT_SITE_URL),
  NEXT_PUBLIC_DEFAULT_SITE: stringWithDefault("sz"),
  ANALYTICS_API_BASE_URL: stringWithDefault("https://newsonafrica.com/api/analytics"),
  WORDPRESS_REQUEST_TIMEOUT_MS: positiveIntegerWithDefault(30000),
})

const BASE_ENV_SCHEMA = WORDPRESS_COUNTRY_CODES.reduce(
  (schema, country) =>
    schema.extend({
      [`NEXT_PUBLIC_WP_${country.toUpperCase()}_GRAPHQL`]: graphQlEndpointOverride(country),
      [`NEXT_PUBLIC_WP_${country.toUpperCase()}_REST_BASE`]: restEndpointOverride(country),
    }),
  baseEnvSchema,
)

const WORDPRESS_AUTH_HEADERS_SCHEMA = z.preprocess(
  (value) => {
    const trimmed = trimToUndefined(value)
    return trimmed ?? undefined
  },
  z
    .string()
    .transform((value, ctx) => {
      if (!value.startsWith("{")) {
        return { Authorization: value }
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(value)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "WORDPRESS_GRAPHQL_AUTH_HEADER must be valid JSON when using object syntax",
        })
        return z.NEVER
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "WORDPRESS_GRAPHQL_AUTH_HEADER JSON must be an object of header key/value pairs",
        })
        return z.NEVER
      }

      const entries: [string, string][] = []

      for (const [key, rawValue] of Object.entries(parsed)) {
        if (typeof rawValue !== "string") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "WORDPRESS_GRAPHQL_AUTH_HEADER JSON values must all be strings",
          })
          return z.NEVER
        }

        const trimmedKey = key.trim()
        const trimmedValue = rawValue.trim()

        if (!trimmedKey || !trimmedValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "WORDPRESS_GRAPHQL_AUTH_HEADER headers must have non-empty keys and values",
          })
          return z.NEVER
        }

        entries.push([trimmedKey, trimmedValue])
      }

      if (entries.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "WORDPRESS_GRAPHQL_AUTH_HEADER JSON must contain at least one header",
        })
        return z.NEVER
      }

      return Object.fromEntries(entries)
    })
    .optional(),
)

const parsedEnv = BASE_ENV_SCHEMA.parse(process.env)

type EnvConfig = z.infer<typeof BASE_ENV_SCHEMA>

const ENV: Readonly<EnvConfig> = Object.freeze(parsedEnv)

const parsedWordPressAuthHeaders = WORDPRESS_AUTH_HEADERS_SCHEMA.parse(
  process.env.WORDPRESS_GRAPHQL_AUTH_HEADER,
)

type WordPressGraphQLAuthHeaders =
  | Readonly<Record<string, string>>
  | undefined

const WP_AUTH_HEADERS: WordPressGraphQLAuthHeaders = parsedWordPressAuthHeaders
  ? Object.freeze({ ...parsedWordPressAuthHeaders })
  : undefined

export { ENV, WP_AUTH_HEADERS }
export type { EnvConfig, WordPressGraphQLAuthHeaders }

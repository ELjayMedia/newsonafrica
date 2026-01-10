import "server-only"
import { z } from "zod"

const trimToUndefined = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const stringWithDefault = (defaultValue: string) => z.preprocess(trimToUndefined, z.string().default(defaultValue))

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
          message: "WORDPRESS_GRAPHQL_AUTH_HEADER must be valid JSON when using object syntax",
        })
        return z.NEVER
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WORDPRESS_GRAPHQL_AUTH_HEADER JSON must be an object of header key/value pairs",
        })
        return z.NEVER
      }

      const entries: [string, string][] = []

      for (const [key, rawValue] of Object.entries(parsed)) {
        if (typeof rawValue !== "string") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "WORDPRESS_GRAPHQL_AUTH_HEADER JSON values must all be strings",
          })
          return z.NEVER
        }

        const trimmedKey = key.trim()
        const trimmedValue = rawValue.trim()

        if (!trimmedKey || !trimmedValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "WORDPRESS_GRAPHQL_AUTH_HEADER headers must have non-empty keys and values",
          })
          return z.NEVER
        }

        entries.push([trimmedKey, trimmedValue])
      }

      if (entries.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WORDPRESS_GRAPHQL_AUTH_HEADER JSON must contain at least one header",
        })
        return z.NEVER
      }

      return Object.fromEntries(entries)
    })
    .optional(),
)

const SERVER_ENV_SCHEMA = z.object({
  ANALYTICS_API_BASE_URL: stringWithDefault("https://newsonafrica.com/api/analytics"),
  WORDPRESS_REQUEST_TIMEOUT_MS: positiveIntegerWithDefault(30000),
})

const parsedServerEnv = SERVER_ENV_SCHEMA.parse(process.env)
const parsedWordPressAuthHeaders = WORDPRESS_AUTH_HEADERS_SCHEMA.parse(process.env.WORDPRESS_GRAPHQL_AUTH_HEADER)

type ServerEnvConfig = z.infer<typeof SERVER_ENV_SCHEMA>
type WordPressGraphQLAuthHeaders = Readonly<Record<string, string>> | undefined

export const SERVER_ENV: Readonly<ServerEnvConfig> = Object.freeze(parsedServerEnv)
export const WP_AUTH_HEADERS: WordPressGraphQLAuthHeaders = parsedWordPressAuthHeaders
  ? Object.freeze({ ...parsedWordPressAuthHeaders })
  : undefined

export type { ServerEnvConfig, WordPressGraphQLAuthHeaders }

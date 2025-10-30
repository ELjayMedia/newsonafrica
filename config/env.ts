const DEFAULT_SITE_URL = "http://app.newsonafrica.com"
type EnvConfig = {
  NEXT_PUBLIC_SITE_URL: string
  NEXT_PUBLIC_DEFAULT_SITE: string
  NEXT_PUBLIC_WP_SZ_GRAPHQL?: string
  NEXT_PUBLIC_WP_ZA_GRAPHQL?: string
  ANALYTICS_API_BASE_URL: string
  WORDPRESS_REQUEST_TIMEOUT_MS: number
}

type WordPressGraphQLAuthHeaders = Record<string, string>

function readEnvValue(name: string): string | undefined {
  const value = process.env[name]
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readString(name: string, defaultValue: string): string {
  const value = readEnvValue(name)
  if (value == null) {
    return defaultValue
  }
  return value
}

function readOptionalString(name: string): string | undefined {
  return readEnvValue(name)
}

function readPositiveInteger(name: string, defaultValue: number): number {
  const rawValue = readEnvValue(name)
  if (!rawValue) {
    return defaultValue
  }

  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `Invalid value provided for ${name}="${rawValue}". Falling back to default ${defaultValue}.`,
    )
    return defaultValue
  }

  return parsed
}

function parseWordPressGraphQLAuthHeaders(
  rawValue: string,
): WordPressGraphQLAuthHeaders | undefined {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return undefined
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        console.warn(
          "WORDPRESS_GRAPHQL_AUTH_HEADER must be a JSON object when using JSON syntax.",
        )
        return undefined
      }

      const entries = Object.entries(parsed).filter((entry): entry is [string, string] => {
        const [key, value] = entry
        return typeof key === "string" && typeof value === "string" && value.trim().length > 0
      })

      if (!entries.length) {
        console.warn(
          "WORDPRESS_GRAPHQL_AUTH_HEADER JSON object did not contain any string header values.",
        )
        return undefined
      }

      return Object.fromEntries(entries)
    } catch (error) {
      console.warn(
        "Failed to parse WORDPRESS_GRAPHQL_AUTH_HEADER as JSON. The value will be ignored.",
        error,
      )
      return undefined
    }
  }

  return { Authorization: trimmed }
}

/**
 * Reads optional server-only headers (Authorization and companions) that should be attached to WordPress GraphQL fetches.
 *
 * The value can either be a raw Authorization token (e.g. "Bearer <token>") or a JSON object of header key/value pairs.
 * The string is trimmed before parsing. Invalid or empty values are ignored.
 */
function getWordPressGraphQLAuthHeaders(): WordPressGraphQLAuthHeaders | undefined {
  const rawValue = readEnvValue("WORDPRESS_GRAPHQL_AUTH_HEADER")
  if (!rawValue) {
    return undefined
  }

  return parseWordPressGraphQLAuthHeaders(rawValue)
}

function createEnv(): EnvConfig {
  return {
    NEXT_PUBLIC_SITE_URL: readString("NEXT_PUBLIC_SITE_URL", DEFAULT_SITE_URL),
    NEXT_PUBLIC_DEFAULT_SITE: readString("NEXT_PUBLIC_DEFAULT_SITE", "sz"),
    NEXT_PUBLIC_WP_SZ_GRAPHQL: readOptionalString("NEXT_PUBLIC_WP_SZ_GRAPHQL"),
    NEXT_PUBLIC_WP_ZA_GRAPHQL: readOptionalString("NEXT_PUBLIC_WP_ZA_GRAPHQL"),
    ANALYTICS_API_BASE_URL: readString(
      "ANALYTICS_API_BASE_URL",
      "https://newsonafrica.com/api/analytics",
    ),
    WORDPRESS_REQUEST_TIMEOUT_MS: readPositiveInteger("WORDPRESS_REQUEST_TIMEOUT_MS", 30000),
  }
}

const env = createEnv()

export { env }
export { getWordPressGraphQLAuthHeaders }
export type { EnvConfig, WordPressGraphQLAuthHeaders }

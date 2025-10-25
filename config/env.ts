const DEFAULT_SITE_URL = "http://app.newsonafrica.com"
type EnvConfig = {
  NEXT_PUBLIC_SITE_URL: string
  NEXT_PUBLIC_DEFAULT_SITE: string
  NEXT_PUBLIC_WP_SZ_GRAPHQL?: string
  NEXT_PUBLIC_WP_ZA_GRAPHQL?: string
  ANALYTICS_API_BASE_URL: string
  WORDPRESS_REQUEST_TIMEOUT_MS: number
}

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
export type { EnvConfig }

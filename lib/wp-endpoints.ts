import { ENV } from "@/config/env"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const BASE_URL = "https://newsonafrica.com"
const DEFAULT_SITE = ENV.NEXT_PUBLIC_DEFAULT_SITE

const GRAPHQL_SUFFIX = "GRAPHQL"
const REST_SUFFIX = "REST_BASE"
const GRAPHQL_PATHNAME_ALLOWLIST: RegExp[] = []

const trimTrailingSlashes = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined
  }

  return value.replace(/\/+$/, "")
}

const normalizeCountry = (country: string): string => {
  const normalized = country?.trim().toLowerCase()
  return normalized || DEFAULT_SITE
}

const buildEnvKey = (country: string, suffix: string) => `NEXT_PUBLIC_WP_${country.toUpperCase()}_${suffix}`

const getEnvValue = (key: string): string | undefined => trimTrailingSlashes(process.env[key])

const getDefaultGraphQLEndpoint = (country: string): string => `${BASE_URL}/${country}/graphql`
const getDefaultRestBase = (country: string): string => `${BASE_URL}/${country}/wp-json/wp/v2`

const looksLikeGraphQLEndpoint = (value?: string | null) => Boolean(value && value.toLowerCase().includes("/graphql"))

const isGraphQlPathname = (pathname: string): boolean => {
  const normalizedPath = pathname.toLowerCase().replace(/\/+$/, "")

  if (normalizedPath.endsWith("/graphql")) {
    return true
  }

  return GRAPHQL_PATHNAME_ALLOWLIST.some((pattern) => pattern.test(normalizedPath))
}

const getOverridePathname = (value: string): string | undefined => {
  try {
    const pathname = new URL(value).pathname
    return pathname.replace(/\/+$/, "")
  } catch {
    return undefined
  }
}

const warnGraphQlOverride = (country: string, override: string, fallback: string, reason: string) => {
  console.warn("Ignoring WP GraphQL override", {
    country,
    graphqlOverride: override,
    effectiveGraphQLEndpoint: fallback,
    reason,
  })
}

const toSignature = (country: string) =>
  [
    process.env[buildEnvKey(country, GRAPHQL_SUFFIX)],
    process.env[buildEnvKey(country, REST_SUFFIX)],
    ENV.NEXT_PUBLIC_DEFAULT_SITE,
    country,
  ].join("|")

interface CachedEndpoints {
  endpoints: WordPressEndpoints
  signature: string
}

const cache = new Map<string, CachedEndpoints>()

export function getGraphQLEndpoint(country: string = DEFAULT_SITE): string {
  const normalized = normalizeCountry(country)
  const defaultGraphQl = getDefaultGraphQLEndpoint(normalized)
  const specific = getEnvValue(buildEnvKey(normalized, GRAPHQL_SUFFIX))

  if (specific) {
    const pathname = getOverridePathname(specific)

    if (!pathname) {
      warnGraphQlOverride(normalized, specific, defaultGraphQl, "must be a valid absolute URL")
      return defaultGraphQl
    }

    if (!isGraphQlPathname(pathname)) {
      warnGraphQlOverride(normalized, specific, defaultGraphQl, 'expected pathname to end with "/graphql" or match an allowlisted pattern')
      return defaultGraphQl
    }
  }

  return specific || defaultGraphQl
}

export function getRestBase(country: string = DEFAULT_SITE): string {
  const normalized = normalizeCountry(country)
  const defaultRestBase = getDefaultRestBase(normalized)
  const specific = getEnvValue(buildEnvKey(normalized, REST_SUFFIX))

  if (looksLikeGraphQLEndpoint(specific)) {
    console.warn("Ignoring WP REST override because it appears to be a GraphQL endpoint", {
      country: normalized,
      restOverride: specific,
      defaultRestBase,
    })
    return defaultRestBase
  }

  return specific || defaultRestBase
}

export function getWpEndpoints(country: string = DEFAULT_SITE): WordPressEndpoints {
  const normalized = normalizeCountry(country)
  const signature = toSignature(normalized)
  const cached = cache.get(normalized)

  if (cached?.signature === signature) {
    return cached.endpoints
  }

  const endpoints: WordPressEndpoints = {
    graphql: getGraphQLEndpoint(normalized),
    rest: getRestBase(normalized),
  }

  cache.set(normalized, { endpoints, signature })
  return endpoints
}

export const WORDPRESS_ENDPOINTS = new Proxy<Record<string, WordPressEndpoints>>(
  {},
  {
    get: (_, property: string | symbol) => {
      if (typeof property !== "string") {
        return undefined
      }

      return getWpEndpoints(property)
    },
  },
)

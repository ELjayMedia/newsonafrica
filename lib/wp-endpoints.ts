import { env } from "@/config/env"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const BASE_URL = "https://newsonafrica.com"
const DEFAULT_SITE = env.NEXT_PUBLIC_DEFAULT_SITE || "sz"

const GRAPHQL_SUFFIX = "GRAPHQL"
const REST_SUFFIX = "REST_BASE"

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

const toSignature = (country: string) =>
  [
    process.env[buildEnvKey(country, GRAPHQL_SUFFIX)],
    process.env[buildEnvKey(country, REST_SUFFIX)],
    process.env.NEXT_PUBLIC_WP_GRAPHQL,
    process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
    process.env.NEXT_PUBLIC_WP_REST_BASE,
    process.env.WORDPRESS_REST_API_URL,
    country,
  ].join("|")

interface CachedEndpoints {
  endpoints: WordPressEndpoints
  signature: string
}

const cache = new Map<string, CachedEndpoints>()

export function getGraphQLEndpoint(country: string = DEFAULT_SITE): string {
  const normalized = normalizeCountry(country)
  const specific = getEnvValue(buildEnvKey(normalized, GRAPHQL_SUFFIX))
  const fallback =
    trimTrailingSlashes(process.env.NEXT_PUBLIC_WP_GRAPHQL || env.NEXT_PUBLIC_WP_GRAPHQL) ||
    trimTrailingSlashes(process.env.NEXT_PUBLIC_WORDPRESS_API_URL || env.NEXT_PUBLIC_WORDPRESS_API_URL)

  return specific || fallback || getDefaultGraphQLEndpoint(normalized)
}

export function getRestBase(country: string = DEFAULT_SITE): string {
  const normalized = normalizeCountry(country)
  const defaultRestBase = getDefaultRestBase(normalized)
  const specific = getEnvValue(buildEnvKey(normalized, REST_SUFFIX))
  let fallback =
    trimTrailingSlashes(process.env.NEXT_PUBLIC_WP_REST_BASE || env.NEXT_PUBLIC_WP_REST_BASE) ||
    trimTrailingSlashes(process.env.WORDPRESS_REST_API_URL || env.WORDPRESS_REST_API_URL)

  if (fallback?.toLowerCase().includes("/graphql")) {
    console.warn("Ignoring WP REST fallback because it appears to be a GraphQL endpoint", {
      country: normalized,
      fallback,
      defaultRestBase,
    })
    fallback = undefined
  }

  return specific || fallback || defaultRestBase
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

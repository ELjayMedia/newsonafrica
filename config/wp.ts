import { env } from "@/config/env"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const DEFAULT_SITE = env.NEXT_PUBLIC_DEFAULT_SITE || 'sz'

const GRAPHQL_ENV_OVERRIDES = {
  sz: "NEXT_PUBLIC_WORDPRESS_API_URL_SZ",
  za: "NEXT_PUBLIC_WORDPRESS_API_URL_ZA",
} as const satisfies Record<string, keyof typeof env>

const REST_ENV_OVERRIDES = {
  sz: "WORDPRESS_REST_API_URL_SZ",
  za: "WORDPRESS_REST_API_URL_ZA",
} as const satisfies Record<string, keyof typeof env>

interface CachedEndpoints {
  endpoints: WordPressEndpoints
  signature: string
}

const cache = new Map<string, CachedEndpoints>()

function readOptionalEnvValue<K extends keyof typeof env>(key: K | undefined) {
  return key ? env[key] : undefined
}

function resolveGraphqlEndpoint(site: string): string {
  const lower = site.toLowerCase()
  const upper = lower.toUpperCase()
  const envOverrideKey = GRAPHQL_ENV_OVERRIDES[lower as keyof typeof GRAPHQL_ENV_OVERRIDES]
  const envOverride = readOptionalEnvValue(envOverrideKey)
  const globalGraphql =
    process.env.NEXT_PUBLIC_WORDPRESS_API_URL || env.NEXT_PUBLIC_WORDPRESS_API_URL
  const endpoint =
    process.env[`NEXT_PUBLIC_WORDPRESS_API_URL_${upper}`] || envOverride || globalGraphql

  if (!endpoint) {
    const guidance = [
      `Missing WordPress GraphQL endpoint for site "${site}".`,
      `Set NEXT_PUBLIC_WORDPRESS_API_URL_${upper} or NEXT_PUBLIC_WORDPRESS_API_URL.`,
    ].join(" ")

    throw new Error(guidance)
  }

  return endpoint
}

function resolveRestEndpoint(site: string): string {
  const lower = site.toLowerCase()
  const upper = lower.toUpperCase()
  const envOverrideKey = REST_ENV_OVERRIDES[lower as keyof typeof REST_ENV_OVERRIDES]
  const envOverride = readOptionalEnvValue(envOverrideKey)
  return (
    process.env[`WORDPRESS_REST_API_URL_${upper}`] ||
    envOverride ||
    process.env.WORDPRESS_REST_API_URL ||
    env.WORDPRESS_REST_API_URL ||
    `https://newsonafrica.com/${site}/wp-json/wp/v2`
  )
}

function buildEndpoints(site: string): WordPressEndpoints {
  return {
    graphql: resolveGraphqlEndpoint(site),
    rest: resolveRestEndpoint(site),
  }
}

function buildSignature(site: string): string {
  const lower = site.toLowerCase()
  const upper = lower.toUpperCase()
  const envGraphqlKey = GRAPHQL_ENV_OVERRIDES[lower as keyof typeof GRAPHQL_ENV_OVERRIDES]
  const envGraphql = readOptionalEnvValue(envGraphqlKey) || ""
  const envRestKey = REST_ENV_OVERRIDES[lower as keyof typeof REST_ENV_OVERRIDES]
  const envRest = readOptionalEnvValue(envRestKey) || ""
  const globalGraphql =
    process.env.NEXT_PUBLIC_WORDPRESS_API_URL || env.NEXT_PUBLIC_WORDPRESS_API_URL || ""
  const globalRest = process.env.WORDPRESS_REST_API_URL || env.WORDPRESS_REST_API_URL || ""

  return [
    process.env[`NEXT_PUBLIC_WORDPRESS_API_URL_${upper}`] ?? envGraphql,
    process.env[`WORDPRESS_REST_API_URL_${upper}`] ?? envRest,
    globalGraphql,
    globalRest,
  ].join("|")
}

export function getWpEndpoints(site: string = DEFAULT_SITE): WordPressEndpoints {
  const signature = buildSignature(site)
  const cached = cache.get(site)

  if (cached && cached.signature === signature) {
    return cached.endpoints
  }

  const endpoints = buildEndpoints(site)
  cache.set(site, { endpoints, signature })
  return endpoints
}

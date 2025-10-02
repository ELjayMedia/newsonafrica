import { env } from "@/config/env"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const DEFAULT_SITE = env.NEXT_PUBLIC_DEFAULT_SITE || 'sz'

interface CachedEndpoints {
  endpoints: WordPressEndpoints
  signature: string
}

const cache = new Map<string, CachedEndpoints>()

function resolveGraphqlEndpoint(site: string): string {
  const upper = site.toUpperCase()
  const globalGraphql = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || env.NEXT_PUBLIC_WORDPRESS_API_URL
  const endpoint = process.env[`NEXT_PUBLIC_WORDPRESS_API_URL_${upper}`] || globalGraphql

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
  const upper = site.toUpperCase()
  return (
    process.env[`WORDPRESS_REST_API_URL_${upper}`] ||
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
  const upper = site.toUpperCase()
  const globalGraphql = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || env.NEXT_PUBLIC_WORDPRESS_API_URL || ""
  const globalRest = process.env.WORDPRESS_REST_API_URL || env.WORDPRESS_REST_API_URL || ""

  return [
    process.env[`NEXT_PUBLIC_WORDPRESS_API_URL_${upper}`] ?? "",
    process.env[`WORDPRESS_REST_API_URL_${upper}`] ?? "",
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

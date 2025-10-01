import { env } from "@/config/env"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const DEFAULT_SITE = env.NEXT_PUBLIC_DEFAULT_SITE || "sz"
const BASE_URL = "https://newsonafrica.com"

interface CachedEndpoints {
  endpoints: WordPressEndpoints
  signature: string
}

const cache = new Map<string, CachedEndpoints>()

function isValidGraphQLEndpoint(url: string): boolean {
  // GraphQL endpoints should end with /graphql, not /wp-json/wp/v2
  return url.includes("/graphql") && !url.includes("/wp-json")
}

function isValidRESTEndpoint(url: string): boolean {
  // REST endpoints should include /wp-json/wp/v2 and a country slug
  return url.includes("/wp-json/wp/v2") && url.split("/").filter(Boolean).length > 3
}

function buildEndpoints(site: string): WordPressEndpoints {
  let graphqlUrl = env.NEXT_PUBLIC_WORDPRESS_API_URL
  let restUrl = env.WORDPRESS_REST_API_URL

  // If the GraphQL URL is actually pointing to REST API, ignore it
  if (graphqlUrl && !isValidGraphQLEndpoint(graphqlUrl)) {
    console.warn(`[v0] Invalid GraphQL endpoint detected: ${graphqlUrl}, using default`)
    graphqlUrl = undefined
  }

  // If the REST URL doesn't include country slug, ignore it
  if (restUrl && !isValidRESTEndpoint(restUrl)) {
    console.warn(`[v0] Invalid REST endpoint detected: ${restUrl}, using default`)
    restUrl = undefined
  }

  return {
    graphql: graphqlUrl || `${BASE_URL}/${site}/graphql`,
    rest: restUrl || `${BASE_URL}/${site}/wp-json/wp/v2`,
  }
}

function buildSignature(site: string): string {
  return [env.NEXT_PUBLIC_WORDPRESS_API_URL, env.WORDPRESS_REST_API_URL, site].join("|")
}

export function getWpEndpoints(site: string = DEFAULT_SITE): WordPressEndpoints {
  const signature = buildSignature(site)
  const cached = cache.get(site)

  if (cached && cached.signature === signature) {
    return cached.endpoints
  }

  const endpoints = buildEndpoints(site)

  console.log(`[v0] WordPress endpoints for ${site}:`, endpoints)

  cache.set(site, { endpoints, signature })
  return endpoints
}

import { env } from "@/config/env"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const DEFAULT_SITE = env.NEXT_PUBLIC_DEFAULT_SITE || "sz"

function buildEndpoints(site: string): WordPressEndpoints {
  const baseSite = site || DEFAULT_SITE
  const baseDomain = "https://newsonafrica.com"

  return {
    graphql: `${baseDomain}/graphql`,
    rest: `${baseDomain}/wp-json/wp/v2`,
  }
}

const cache = new Map<string, { endpoints: WordPressEndpoints; signature: string }>()

function buildSignature(site: string) {
  return [site, env.NEXT_PUBLIC_WORDPRESS_API_URL, env.WORDPRESS_REST_API_URL, env.NEXT_PUBLIC_DEFAULT_SITE].join("|")
}

export function getWpEndpoints(site: string = DEFAULT_SITE): WordPressEndpoints {
  const signature = buildSignature(site)
  const cached = cache.get(site)
  if (cached && cached.signature === signature) return cached.endpoints
  const endpoints = buildEndpoints(site)
  cache.set(site, { endpoints, signature })
  return endpoints
}

export const wpConfig = {
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000, // 30 seconds
  fallbackEnabled: true,
  cacheTimeout: 300000, // 5 minutes
}

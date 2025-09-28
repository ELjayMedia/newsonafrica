import { env } from "@/config/env"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const DEFAULT_SITE = (env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()

function buildEndpoints(site: string): WordPressEndpoints {
  const normalized = (site || DEFAULT_SITE).toLowerCase()

  switch (normalized) {
    case "za":
      return {
        graphql: env.NEXT_PUBLIC_WORDPRESS_API_URL_ZA,
        rest: env.WORDPRESS_REST_API_URL_ZA,
      }
    case "sz":
      return {
        graphql: env.NEXT_PUBLIC_WORDPRESS_API_URL_SZ,
        rest: env.WORDPRESS_REST_API_URL_SZ,
      }
    default:
      return {
        graphql: env.NEXT_PUBLIC_WORDPRESS_API_URL,
        rest: env.WORDPRESS_REST_API_URL,
      }
  }
}

const cache = new Map<string, { endpoints: WordPressEndpoints; signature: string }>()

function buildSignature(site: string) {
  return [
    site,
    env.NEXT_PUBLIC_WORDPRESS_API_URL,
    env.NEXT_PUBLIC_WORDPRESS_API_URL_ZA,
    env.NEXT_PUBLIC_WORDPRESS_API_URL_SZ,
    env.WORDPRESS_REST_API_URL,
    env.WORDPRESS_REST_API_URL_ZA,
    env.WORDPRESS_REST_API_URL_SZ,
    env.NEXT_PUBLIC_DEFAULT_SITE,
  ].join("|")
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

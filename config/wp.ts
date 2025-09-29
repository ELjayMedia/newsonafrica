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

function buildEndpoints(site: string): WordPressEndpoints {
  const upper = site.toUpperCase()
  return {
      graphql:
        process.env[`NEXT_PUBLIC_WORDPRESS_API_URL_${upper}`] ||
        env.NEXT_PUBLIC_WORDPRESS_API_URL ||
        `https://newsonafrica.com/${site}/graphql`,
      rest:
        process.env[`WORDPRESS_REST_API_URL_${upper}`] ||
        env.WORDPRESS_REST_API_URL ||
        `https://newsonafrica.com/${site}/wp-json/wp/v2`,
  }
}

function buildSignature(site: string): string {
  const upper = site.toUpperCase()
  return [
    process.env[`NEXT_PUBLIC_WORDPRESS_API_URL_${upper}`],
    process.env[`WORDPRESS_REST_API_URL_${upper}`],
    env.NEXT_PUBLIC_WORDPRESS_API_URL,
    env.WORDPRESS_REST_API_URL,
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

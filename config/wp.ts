import { env } from "@/config/env"

export interface WordPressEndpoints {
  graphql: string
  rest: string
}

const DEFAULT_SITE = env.NEXT_PUBLIC_DEFAULT_SITE || 'sz'

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

export function getWpEndpoints(site: string = DEFAULT_SITE): WordPressEndpoints {
  return buildEndpoints(site)
}

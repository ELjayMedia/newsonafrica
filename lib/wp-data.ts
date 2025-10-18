import { type WordPressCategory, getLatestPostsForCountry, getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import { COUNTRIES } from "@/lib/wordpress/client"
import type { WordPressPost } from "@/types/wp"

const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()

export type GetPostsByCountryOptions = {
  category?: string
  first?: number
}

type PageInfo = {
  hasNextPage: boolean
  endCursor: string | null
}

type PostsResponse = {
  nodes: WordPressPost[]
  posts: WordPressPost[]
  pageInfo: PageInfo
  category?: WordPressCategory | null
}

function normalizeCountryCode(country?: string | null): string {
  if (!country) return DEFAULT_COUNTRY
  const normalized = country.toLowerCase()
  if (normalized === "default") {
    return DEFAULT_COUNTRY
  }
  if (COUNTRIES[normalized]) {
    return normalized
  }
  return DEFAULT_COUNTRY
}

export async function getPostsByCountry(
  country: string,
  options: GetPostsByCountryOptions = {},
): Promise<PostsResponse> {
  const { category, first = 20 } = options
  const countryCode = normalizeCountryCode(country)

  if (category) {
    const result = await getPostsByCategoryForCountry(countryCode, category, first)
    return {
      nodes: result.posts,
      posts: result.posts,
      pageInfo: {
        hasNextPage: result.hasNextPage,
        endCursor: result.endCursor,
      },
      category: result.category ?? null,
    }
  }

  const result = await getLatestPostsForCountry(countryCode, first)
  return {
    nodes: result.posts,
    posts: result.posts,
    pageInfo: {
      hasNextPage: result.hasNextPage,
      endCursor: result.endCursor,
    },
  }
}

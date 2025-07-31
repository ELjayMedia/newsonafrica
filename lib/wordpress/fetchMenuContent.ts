import { getPostsByCategoryForCountry } from "../api/wordpress"

/**
 * Fetch menu content for a given country and category slug.
 * Falls back to an empty result on failure.
 */
export async function fetchMenuContent(countryCode: string, slug: string) {
  try {
    return await getPostsByCategoryForCountry(countryCode, slug, 5)
  } catch (error) {
    console.error(`Failed to fetch menu content for ${countryCode}/${slug}:`, error)
    return { category: null, posts: [], hasNextPage: false, endCursor: null }
  }
}

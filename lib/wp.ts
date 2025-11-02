import { getLatestPostsForCountry } from "@/lib/wordpress/posts"
import type { WordPressPost } from "@/types/wp"

export type CountryCode = string
export type WpPost = WordPressPost

export async function getLatestPosts(countryCode: CountryCode, limit = 20) {
  const result = await getLatestPostsForCountry(countryCode, limit)
  return result.posts
}

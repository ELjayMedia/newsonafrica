import { DEFAULT_COUNTRY } from "@/lib/wordpress/shared"
import type { WordPressPost } from "@/types/wp"

type SitemapPost = WordPressPost & {
  country?: string
}

export const toSitemapCountry = (post: SitemapPost): string => {
  return post.country && post.country.length > 0 ? post.country : DEFAULT_COUNTRY
}

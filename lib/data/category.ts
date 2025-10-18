import { getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import type { CategoryPostsResult, WordPressCategory } from "@/lib/wordpress/types"
import { mapWordPressPostsToPostListItems, type PostListItemData, type PostListCategory } from "./post-list"
import { getCategoryUrl } from "@/lib/utils/routing"
import { decodeHtmlEntities } from "@/lib/utils/decodeHtmlEntities"

export interface CategorySummary extends Omit<PostListCategory, "href"> {
  description?: string
  totalPosts?: number
  href: string
}

export interface CategoryPageSuccess {
  kind: "success"
  category: CategorySummary
  posts: PostListItemData[]
  relatedCategories: CategorySummary[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}

export interface CategoryPageNotFound {
  kind: "not-found"
}

export type CategoryPageResult = CategoryPageSuccess | CategoryPageNotFound

const toCategorySummary = (category: WordPressCategory, countryCode: string): CategorySummary => ({
  name: decodeHtmlEntities(category.name),
  slug: category.slug,
  description: category.description ?? undefined,
  totalPosts: category.count ?? undefined,
  href: getCategoryUrl(category.slug, countryCode),
})

const collectRelatedCategories = (
  postsResult: CategoryPostsResult,
  countryCode: string,
): CategorySummary[] => {
  const related = new Map<string, CategorySummary>()

  postsResult.posts.forEach((post) => {
    post.categories?.nodes?.forEach((category) => {
      if (!category?.slug || !category?.name) {
        return
      }

      if (category.slug === postsResult.category?.slug) {
        return
      }

      if (!related.has(category.slug)) {
        related.set(category.slug, {
          name: decodeHtmlEntities(category.name),
          slug: category.slug,
          href: getCategoryUrl(category.slug, countryCode),
        })
      }
    })
  })

  return Array.from(related.values()).slice(0, 8)
}

export async function getCategoryPageData(
  countryCode: string,
  slug: string,
  first = 20,
): Promise<CategoryPageResult> {
  const postsResult = await getPostsByCategoryForCountry(countryCode, slug, first)

  if (!postsResult.category) {
    return { kind: "not-found" }
  }

  const posts = mapWordPressPostsToPostListItems(postsResult.posts, countryCode)

  return {
    kind: "success",
    category: toCategorySummary(postsResult.category, countryCode),
    posts,
    relatedCategories: collectRelatedCategories(postsResult, countryCode),
    pageInfo: { hasNextPage: postsResult.hasNextPage, endCursor: postsResult.endCursor },
  }
}

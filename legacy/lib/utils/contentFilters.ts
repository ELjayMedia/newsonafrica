// @ts-nocheck
import type { WordPressPost } from "@/types/wp"

/**
 * Filter posts by tag
 */
export function filterPostsByTag(posts: WordPressPost[], tagSlug: string): WordPressPost[] {
  return posts.filter((post) =>
    post.tags?.nodes?.some((tag) => tag.slug === tagSlug || tag.name.toLowerCase() === tagSlug.toLowerCase()),
  )
}

/**
 * Filter posts by multiple tags (OR condition)
 */
export function filterPostsByTags(posts: WordPressPost[], tagSlugs: string[]): WordPressPost[] {
  return posts.filter((post) =>
    post.tags?.nodes?.some((tag) =>
      tagSlugs.some((tagSlug) => tag.slug === tagSlug || tag.name.toLowerCase() === tagSlug.toLowerCase()),
    ),
  )
}

/**
 * Filter posts by category
 */
export function filterPostsByCategory(posts: WordPressPost[], categorySlug: string): WordPressPost[] {
  return posts.filter((post) =>
    post.categories?.nodes?.some(
      (category) => category.slug === categorySlug || category.name.toLowerCase() === categorySlug.toLowerCase(),
    ),
  )
}

/**
 * Get featured posts (fp-tagged posts)
 */
export function getFeaturedPosts(posts: WordPressPost[]): WordPressPost[] {
  return filterPostsByTags(posts, ["fp", "featured", "front-page"])
}

/**
 * Sort posts by date (newest first)
 */
export function sortPostsByDate(posts: WordPressPost[]): WordPressPost[] {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Get posts with pagination
 */
export function getPaginatedPosts(
  posts: WordPressPost[],
  page: number,
  limit: number,
): {
  posts: WordPressPost[]
  hasMore: boolean
  total: number
} {
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedPosts = posts.slice(startIndex, endIndex)

  return {
    posts: paginatedPosts,
    hasMore: endIndex < posts.length,
    total: posts.length,
  }
}

/**
 * Remove duplicate posts by ID
 */
export function removeDuplicatePosts(posts: WordPressPost[]): WordPressPost[] {
  const seen = new Set<string>()
  return posts.filter((post) => {
    if (seen.has(post.id)) {
      return false
    }
    seen.add(post.id)
    return true
  })
}

/**
 * Validate post has required fields
 */
export function validatePost(post: WordPressPost): boolean {
  return !!(post.id && post.title && post.slug && post.excerpt && post.date && post.author?.node?.name)
}

/**
 * Filter out invalid posts
 */
export function filterValidPosts(posts: WordPressPost[]): WordPressPost[] {
  return posts.filter(validatePost)
}

import type { HomePost } from "@/types/home"
import type { AggregatedHomeData } from "@/lib/wordpress/service"

/**
 * Creates a unique key for a HomePost to use in deduplication
 */
export const createHomePostKey = (post: HomePost): string => {
  if (post.globalRelayId) {
    return post.globalRelayId
  }

  if (post.id) {
    return `${post.country ?? ""}:${post.id}`
  }

  if (post.slug) {
    return `${post.country ?? ""}:${post.slug}`
  }

  return `${post.country ?? ""}:${post.slug ?? ""}:${post.title ?? ""}:${post.date ?? ""}`
}

/**
 * Removes duplicate posts based on their unique key
 */
export const dedupeHomePosts = (posts: HomePost[]): HomePost[] => {
  const seen = new Set<string>()
  const unique: HomePost[] = []

  for (const post of posts) {
    const key = createHomePostKey(post)

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(post)
    }
  }

  return unique
}

/**
 * Creates an empty AggregatedHomeData object
 */
export const createEmptyAggregatedHome = (): AggregatedHomeData => ({
  heroPost: null,
  secondaryPosts: [],
  remainingPosts: [],
})

/**
 * Builds AggregatedHomeData from a flat array of posts
 */
export const buildAggregatedHomeFromPosts = (posts: HomePost[]): AggregatedHomeData => {
  const uniquePosts = dedupeHomePosts(posts)

  if (uniquePosts.length === 0) {
    return createEmptyAggregatedHome()
  }

  const [heroPost, ...rest] = uniquePosts

  return {
    heroPost,
    secondaryPosts: rest.slice(0, 3),
    remainingPosts: rest.slice(3),
  }
}

/**
 * Checks if AggregatedHomeData has any content
 */
export const hasAggregatedHomeContent = ({
  heroPost,
  secondaryPosts,
  remainingPosts,
}: AggregatedHomeData): boolean =>
  Boolean(heroPost || secondaryPosts.length > 0 || remainingPosts.length > 0)

/**
 * Flattens AggregatedHomeData back into a flat array of posts
 */
export const flattenAggregatedHome = ({
  heroPost,
  secondaryPosts,
  remainingPosts,
}: AggregatedHomeData): HomePost[] => {
  const posts: HomePost[] = []

  if (heroPost) {
    posts.push(heroPost)
  }

  if (secondaryPosts?.length) {
    posts.push(...secondaryPosts)
  }

  if (remainingPosts?.length) {
    posts.push(...remainingPosts)
  }

  return posts
}

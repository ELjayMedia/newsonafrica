import { decodeHtmlEntities } from "../utils/decodeHtmlEntities"
import { mapWpPost } from "../utils/mapWpPost"
import type { HomePost } from "@/types/home"
import type { WordPressPost } from "./client"

export const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz"
export const FP_TAG_SLUG = "fp" as const

export const mapPostFromWp = (post: unknown, countryCode?: string): WordPressPost =>
  mapWpPost(post as WordPressPost, "rest", countryCode)

export const resolveHomePostId = (post: WordPressPost): string => {
  if (post.globalRelayId) {
    return post.globalRelayId
  }

  if (typeof post.id === "string" && post.id.length > 0) {
    return post.id
  }

  if (typeof post.databaseId === "number") {
    return String(post.databaseId)
  }

  if (post.slug && post.slug.length > 0) {
    return post.slug
  }

  return ""
}

export const mapWordPressPostToHomePost = (
  post: WordPressPost,
  countryCode: string,
): HomePost => ({
  id: resolveHomePostId(post),
  globalRelayId: post.globalRelayId,
  slug: post.slug ?? "",
  title: decodeHtmlEntities(typeof post.title === "string" ? post.title : ""),
  excerpt: decodeHtmlEntities(typeof post.excerpt === "string" ? post.excerpt : ""),
  date: post.date ?? "",
  country: countryCode,
  featuredImage: post.featuredImage?.node
    ? {
        node: {
          sourceUrl: post.featuredImage.node.sourceUrl ?? undefined,
          altText: post.featuredImage.node.altText ?? undefined,
        },
      }
    : undefined,
})

export const mapGraphqlNodeToHomePost = (
  post: unknown,
  countryCode: string,
): HomePost => {
  const mapped = mapWpPost(post as WordPressPost, "gql", countryCode)
  return mapWordPressPostToHomePost(mapped, countryCode)
}

export const mapPostsToHomePosts = (
  posts: WordPressPost[] | null | undefined,
  countryCode: string,
): HomePost[] => {
  if (!posts || posts.length === 0) {
    return []
  }
  return posts.map((post) => mapWordPressPostToHomePost(post, countryCode))
}

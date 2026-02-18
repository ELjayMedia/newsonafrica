import { CACHE_DURATIONS } from "../cache/constants"
import { cacheTags } from "../cache/cacheTags"
import { appConfig } from "@/lib/config"
import { TAG_BY_SLUG_QUERY } from "@/lib/wordpress/queries"
import { fetchWordPressGraphQL } from "./client"
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import type { HomePost } from "@/types/home"
import type { WordPressPost, WordPressTag } from "@/types/wp"

type TagBySlugQueryResult = {
  tag?: {
    databaseId?: number | null
    id?: string | null
    name?: string | null
    slug?: string | null
    count?: number | null
  } | null
}

type GraphqlTagNode = TagBySlugQueryResult["tag"]

export const mapGraphqlTagNode = (node: GraphqlTagNode): WordPressTag | null => {
  if (!node) {
    return null
  }

  const slug = typeof node.slug === "string" ? node.slug : null
  if (!slug) {
    return null
  }

  const databaseId = typeof node.databaseId === "number" ? node.databaseId : undefined
  const name = typeof node.name === "string" ? node.name : undefined

  return {
    id: databaseId,
    databaseId,
    name,
    slug,
  }
}

// Constants derived from centralized config
export const DEFAULT_COUNTRY = appConfig.countries.default
export const FP_TAG_SLUG = appConfig.content.fpTagSlug

type GetFpTagForCountryOptions = {
  slug?: string
}

export const getFpTagForCountry = async (
  countryCode: string,
  options: GetFpTagForCountryOptions = {},
): Promise<WordPressTag | null> => {
  const slug = options.slug ?? FP_TAG_SLUG

  const tags = [cacheTags.edition(countryCode), cacheTags.tag(countryCode, slug)]

  try {
    const gqlResult = await fetchWordPressGraphQL<TagBySlugQueryResult>(
      countryCode,
      TAG_BY_SLUG_QUERY,
      { slug },
      { tags, revalidate: CACHE_DURATIONS.NONE },
    )

    if (!gqlResult.ok) {
      console.error(
        `[v0] Failed to fetch FP tag via GraphQL for ${slug} (${countryCode}):`,
        gqlResult,
      )
      return null
    }

    return mapGraphqlTagNode(gqlResult.data?.tag ?? null)
  } catch (error) {
    console.error(
      `[v0] Failed to fetch FP tag via GraphQL for ${slug} (${countryCode}):`,
      error,
    )
    return null
  }
}

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
  title: decodeHtmlEntities(post.title ?? ""),
  excerpt: decodeHtmlEntities(post.excerpt ?? ""),
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
  const mapped = mapGraphqlPostToWordPressPost(post as any, countryCode)
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

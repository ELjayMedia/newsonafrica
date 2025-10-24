import { CACHE_DURATIONS } from "../cache/constants"
import { buildCacheTags } from "../cache/tag-utils"
import { TAG_BY_SLUG_QUERY } from "../wordpress-queries"
import { fetchFromWpGraphQL } from "./client"
import { fetchFromWp, executeRestFallback } from "./rest-client"
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

export const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz"
export const FP_TAG_SLUG = "fp" as const

type GetFpTagForCountryOptions = {
  tags?: string[]
  slug?: string
}

type TagBySlugQueryResult = {
  tag?: {
    databaseId?: number | null
    id?: string | null
    name?: string | null
    slug?: string | null
  } | null
}

const mapGraphqlTagNode = (
  node:
    | {
        databaseId?: number | null
        id?: string | null
        name?: string | null
        slug?: string | null
      }
    | null
    | undefined,
): WordPressTag | null => {
  if (!node || typeof node.slug !== "string" || node.slug.length === 0) {
    return null
  }

  const databaseId = typeof node.databaseId === "number" ? node.databaseId : undefined
  const name = typeof node.name === "string" ? node.name : undefined

  return {
    id: databaseId,
    databaseId,
    name,
    slug: node.slug,
  }
}

export const getFpTagForCountry = async (
  countryCode: string,
  options: GetFpTagForCountryOptions = {},
): Promise<WordPressTag | null> => {
  const slug = options.slug ?? FP_TAG_SLUG
  const tags = options.tags ?? []

  const cacheTags = buildCacheTags({
    country: countryCode,
    section: "tags",
    extra: [`tag:${slug}`],
  })

  let tag: WordPressTag | null = null

  try {
    const gqlResult = await fetchFromWpGraphQL<TagBySlugQueryResult>(
      countryCode,
      TAG_BY_SLUG_QUERY,
      { slug },
      cacheTags,
    )

    tag = mapGraphqlTagNode(gqlResult?.tag ?? null)
  } catch (error) {
    console.error(
      `[v0] Failed to fetch FP tag via GraphQL for ${slug} (${countryCode}):`,
      error,
    )
  }

  if (!tag) {
    const response = await executeRestFallback(
      () =>
        fetchFromWp<WordPressTag[]>(
          countryCode,
          { endpoint: "tags", params: { slug } },
          tags.length > 0 ? { tags } : {},
        ),
      logMessage,
      logMeta,
      { fallbackValue: [] as WordPressTag[] },
    )

    tag = Array.isArray(response) && response.length > 0 ? response[0] ?? null : null
  }

  fpTagCache.set(cacheKey, {
    tag,
    expiresAt: Date.now() + FP_TAG_CACHE_TTL_MS,
  })

  return tag
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

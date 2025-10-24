import { CACHE_DURATIONS } from "../cache/constants"
import { wordpressQueries } from "../wordpress-queries"
import { fetchFromWp, executeRestFallback } from "./rest-client"
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import type { HomePost } from "@/types/home"
import type { WordPressPost, WordPressTag } from "@/types/wp"

export const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz"
export const FP_TAG_SLUG = "fp" as const

const FP_TAG_CACHE_TTL_MS = CACHE_DURATIONS.MEDIUM * 1000

type FpTagCacheEntry = {
  tag: WordPressTag | null
  expiresAt: number
}

const fpTagCache = new Map<string, FpTagCacheEntry>()

const buildFpTagCacheKey = (countryCode: string, slug: string) => `${countryCode}:${slug}`

type GetFpTagForCountryOptions = {
  tags?: string[]
  logMessage?: string
  logMeta?: Record<string, unknown>
  slug?: string
  forceRefresh?: boolean
}

export const invalidateFpTagCache = (countryCode?: string) => {
  if (!countryCode) {
    fpTagCache.clear()
    return
  }

  const prefix = `${countryCode}:`
  for (const key of fpTagCache.keys()) {
    if (key.startsWith(prefix)) {
      fpTagCache.delete(key)
    }
  }
}

export const getFpTagForCountry = async (
  countryCode: string,
  options: GetFpTagForCountryOptions = {},
): Promise<WordPressTag | null> => {
  const slug = options.slug ?? FP_TAG_SLUG
  const cacheKey = buildFpTagCacheKey(countryCode, slug)

  if (!options.forceRefresh) {
    const cached = fpTagCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tag
    }
  }

  const tags = options.tags ?? []
  const logMessage =
    options.logMessage ?? `[v0] FP tag REST fallback failed for ${slug} (${countryCode})`
  const logMeta = {
    countryCode,
    tagSlug: slug,
    ...(options.logMeta ?? {}),
  }

  const response = await executeRestFallback(
    () =>
      fetchFromWp<WordPressTag[]>(
        countryCode,
        wordpressQueries.tagBySlug(slug),
        tags.length > 0 ? { tags } : {},
      ),
    logMessage,
    logMeta,
    { fallbackValue: [] as WordPressTag[] },
  )

  const tag = Array.isArray(response) && response.length > 0 ? response[0] ?? null : null

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

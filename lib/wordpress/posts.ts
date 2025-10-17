import { getRestBase } from "@/lib/wp-endpoints"
import { buildCacheTags } from "../cache/tag-utils"
import {
  FEATURED_POSTS_QUERY,
  LATEST_POSTS_QUERY,
  POST_CATEGORIES_QUERY,
  RELATED_POSTS_QUERY,
  wordpressQueries,
} from "../wordpress-queries"
import {
  executeRestFallback,
  fetchFromWp,
  fetchFromWpGraphQL,
  COUNTRIES,
  type WordPressPost,
} from "./client"
import type {
  FeaturedPostsQuery,
  LatestPostsQuery,
  PostCategoriesQuery,
  RelatedPostsQuery,
} from "@/types/wpgraphql"
import { mapWpPost } from "../utils/mapWpPost"
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities"
import { DEFAULT_COUNTRY, FP_TAG_SLUG } from "./shared"
import type {
  PaginatedPostsResult,
  WordPressTag,
} from "./types"
import type { HomePost } from "@/types/home"

const toErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const { message, name, stack } = error
    return { message, name, stack }
  }
  return { error }
}

const decodeCursorIndex = (cursor: string | null | undefined) => {
  if (!cursor) {
    return null
  }

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8")
    const parts = decoded.split(":")
    const lastPart = parts[parts.length - 1]
    const index = Number.parseInt(lastPart || "", 10)

    return Number.isNaN(index) ? null : index
  } catch (error) {
    console.warn("[v0] Failed to decode pagination cursor for REST fallback", {
      cursor,
      error: toErrorDetails(error),
    })
    return null
  }
}

const cursorToOffset = (cursor: string | null | undefined) => {
  const index = decodeCursorIndex(cursor)
  if (index === null) {
    return null
  }

  return index + 1
}

export async function getLatestPostsForCountry(
  countryCode: string,
  limit = 20,
  cursor?: string | null,
): Promise<PaginatedPostsResult> {
  const tags = buildCacheTags({ country: countryCode, section: "news" })

  try {
    console.log("[v0] Fetching latest posts for:", countryCode)

    const gqlData = await fetchFromWpGraphQL<LatestPostsQuery>(
      countryCode,
      LATEST_POSTS_QUERY,
      {
        first: limit,
        ...(cursor ? { after: cursor } : {}),
      },
      tags,
    )

    if (gqlData?.posts) {
      const nodes = gqlData.posts.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []
      const posts = nodes.map((p) => mapWpPost(p, "gql", countryCode))
      console.log("[v0] Found", posts.length, "latest posts via GraphQL")
      return {
        posts,
        hasNextPage: gqlData.posts.pageInfo.hasNextPage,
        endCursor: gqlData.posts.pageInfo.endCursor ?? null,
      }
    }

    console.log("[v0] No GraphQL results, trying REST fallback")

    const { endpoint, params } = wordpressQueries.recentPosts(limit)
    const offset = cursorToOffset(cursor ?? null)
    const restParams = offset !== null ? { ...params, offset } : params
    const posts = await executeRestFallback(
      () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params: restParams }, { tags }),
      `[v0] Latest posts REST fallback failed for ${countryCode}`,
      { countryCode, limit, endpoint, params: restParams },
      { fallbackValue: [] },
    )

    console.log("[v0] Found", posts.length, "latest posts via REST")
    return {
      posts,
      hasNextPage: posts.length === limit,
      endCursor: null,
    }
  } catch (error) {
    console.error("[v0] Failed to fetch latest posts:", error)
    return {
      posts: [],
      hasNextPage: false,
      endCursor: null,
    }
  }
}

export const getLatestPosts = (limit = 20) => getLatestPostsForCountry(DEFAULT_COUNTRY, limit)

export async function getRelatedPostsForCountry(countryCode: string, postId: string, limit = 6) {
  const tags = buildCacheTags({ country: countryCode, section: "related", extra: [`post:${postId}`] })

  const gqlPost = await fetchFromWpGraphQL<PostCategoriesQuery>(
    countryCode,
    POST_CATEGORIES_QUERY,
    { id: Number(postId) },
    tags,
  )
  if (gqlPost?.post) {
    const catIds =
      gqlPost.post.categories?.nodes
        ?.filter((c): c is NonNullable<typeof c> => typeof c?.databaseId === "number")
        .map((c) => Number(c!.databaseId)) ?? []
    if (catIds.length > 0) {
      const gqlData = await fetchFromWpGraphQL<RelatedPostsQuery>(
        countryCode,
        RELATED_POSTS_QUERY,
        {
          catIds,
          exclude: Number(postId),
          first: limit,
        },
        tags,
      )
      if (gqlData?.posts) {
        const nodes = gqlData.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
        const posts = nodes.map((p) => mapWpPost(p, "gql", countryCode))
        return posts.filter((p) => p.databaseId !== Number(postId))
      }
    }
  }
  const post = await executeRestFallback(
    () => fetchFromWp<WordPressPost | null>(countryCode, wordpressQueries.postById(postId), { tags }),
    `[v0] Related posts REST fallback failed for base post ${postId} (${countryCode})`,
    { countryCode, postId },
    { fallbackValue: null },
  )
  if (!post) {
    return []
  }
  const categoryIds: number[] =
    post.categories?.nodes
      ?.map((cat) => (typeof cat?.databaseId === "number" ? Number(cat.databaseId) : null))
      .filter((id): id is number => id !== null) || []
  if (categoryIds.length === 0) return []
  const { endpoint, params } = wordpressQueries.relatedPosts(categoryIds, postId, limit)
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags }),
    `[v0] Related posts REST fallback failed for ${postId} (${countryCode})`,
    { countryCode, postId, categoryIds, limit, endpoint, params },
    { fallbackValue: [] },
  )
  return posts.filter((p) => p.databaseId !== Number(postId))
}

export const getRelatedPosts = async (
  postId: string,
  categories: string[] = [],
  tags: string[] = [],
  limit = 6,
  countryCode?: string,
): Promise<WordPressPost[]> => {
  const country = countryCode || DEFAULT_COUNTRY

  if (tags.length > 0) {
    const { endpoint, params } = wordpressQueries.relatedPostsByTags(tags, postId, limit)
    const cacheTags = buildCacheTags({
      country,
      section: "related",
      extra: [`post:${postId}`, ...tags.map((tagSlug) => `tag:${tagSlug}`)],
    })
    try {
      const posts = await executeRestFallback(
        () => fetchFromWp<WordPressPost[]>(country, { endpoint, params }, { tags: cacheTags }),
        `[v0] Related posts by tags REST fallback failed for ${postId} (${country})`,
        { country, postId, tags, limit, endpoint, params },
        { fallbackValue: [] },
      )
      return posts.filter((p) => p.id !== Number(postId))
    } catch (error) {
      console.error(`[v0] Related posts by tags request failed for ${postId}`, {
        country,
        postId,
        tags,
        error,
      })
      return []
    }
  }

  const posts = await getRelatedPostsForCountry(country, postId, limit)
  return posts.filter((p) => p.id !== Number(postId))
}

const resolveRenderedText = (value: unknown): string => {
  if (typeof value === "string") {
    return decodeHtmlEntities(value)
  }
  if (
    value &&
    typeof value === "object" &&
    "rendered" in value &&
    typeof (value as { rendered?: unknown }).rendered === "string"
  ) {
    return decodeHtmlEntities((value as { rendered?: string }).rendered ?? "")
  }
  return ""
}

type MaybeMostReadPost = Partial<HomePost> & {
  id?: string | number
  slug?: string
  title?: string | { rendered?: string }
  excerpt?: string | { rendered?: string }
  date?: string
  country?: string
  featuredImage?:
    | HomePost["featuredImage"]
    | {
        node?: {
          sourceUrl?: string
          altText?: string
          source_url?: string
          alt_text?: string
          url?: string
          alt?: string
        }
      }
  featured_image?:
    | HomePost["featuredImage"]
    | {
        node?: {
          sourceUrl?: string
          altText?: string
          source_url?: string
          alt_text?: string
          url?: string
          alt?: string
        }
      }
  featuredImageUrl?: string
  featured_image_url?: string
}

const normalizeFeaturedImage = (post: MaybeMostReadPost): HomePost["featuredImage"] | undefined => {
  const candidate = post.featuredImage || post.featured_image
  if (candidate && typeof candidate === "object" && "node" in candidate && candidate.node) {
    const node = candidate.node as Record<string, unknown>
    const sourceUrl =
      typeof node?.sourceUrl === "string"
        ? (node.sourceUrl as string)
        : typeof node?.source_url === "string"
          ? (node.source_url as string)
          : typeof node?.url === "string"
            ? (node.url as string)
            : undefined
    const altText =
      typeof node?.altText === "string"
        ? (node.altText as string)
        : typeof node?.alt_text === "string"
          ? (node.alt_text as string)
          : typeof node?.alt === "string"
            ? (node.alt as string)
            : undefined

    if (sourceUrl) {
      return {
        node: {
          sourceUrl,
          altText,
        },
      }
    }
  }

  const directSource =
    typeof post.featuredImageUrl === "string"
      ? post.featuredImageUrl
      : typeof post.featured_image_url === "string"
        ? post.featured_image_url
        : undefined

  if (directSource) {
    return {
      node: {
        sourceUrl: directSource,
      },
    }
  }

  return undefined
}

const normalizeMostReadPost = (post: unknown, fallbackCountry: string): HomePost | null => {
  if (!post || typeof post !== "object") {
    return null
  }

  const item = post as MaybeMostReadPost
  const slug = typeof item.slug === "string" ? item.slug : ""
  const title = resolveRenderedText(item.title)
  if (!slug || !title) {
    return null
  }

  const idValue = item.id ?? slug
  const id = typeof idValue === "string" ? idValue : String(idValue)
  const excerpt = resolveRenderedText(item.excerpt)
  const date = typeof item.date === "string" ? item.date : ""
  const country = typeof item.country === "string" ? item.country : fallbackCountry
  const featuredImage = normalizeFeaturedImage(item)

  return {
    id,
    slug,
    title,
    excerpt,
    date,
    country,
    featuredImage,
  }
}

export const fetchMostReadPosts = async (countryCode = DEFAULT_COUNTRY, limit = 5): Promise<HomePost[]> => {
  const params = new URLSearchParams({ country: countryCode })
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    params.set("limit", String(Math.floor(limit)))
  }

  const response = await fetch(`/api/most-read?${params.toString()}`)
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || "Failed to load most-read posts")
  }

  const payload = await response.json().catch(() => [])
  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .map((post) => normalizeMostReadPost(post, countryCode))
    .filter((post): post is HomePost => Boolean(post))
}

export const fetchRecentPosts = async (limit = 20, countryCode = DEFAULT_COUNTRY) => {
  try {
    const { posts } = await getLatestPostsForCountry(countryCode, limit)
    return posts
  } catch (error) {
    console.error("[v0] Failed to fetch recent posts during build:", error)
    return []
  }
}

export const fetchTaggedPosts = async (tagSlug: string, limit = 10, countryCode = DEFAULT_COUNTRY) => {
  const cacheTags = buildCacheTags({
    country: countryCode,
    section: "tags",
    extra: [`tag:${tagSlug}`],
  })

  const tags =
    (await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(tagSlug), {
      tags: cacheTags,
    })) || []
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.postsByTag(tag.id, limit)
  return (await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags: cacheTags })) || []
}

export const fetchPosts = async (
  options:
    | number
    | {
        page?: number
        perPage?: number
        category?: string
        tag?: string
        search?: string
        author?: string
        featured?: boolean
        countryCode?: string
        ids?: Array<number | string>
        countryTermId?: number
      } = {},
) => {
  if (typeof options === "number") {
    const { endpoint, params } = wordpressQueries.recentPosts(options)
    const tags = buildCacheTags({ country: DEFAULT_COUNTRY, section: "news" })
    return (await fetchFromWp<WordPressPost[]>(DEFAULT_COUNTRY, { endpoint, params }, { tags })) || []
  }

  const {
    page = 1,
    perPage = 10,
    category,
    tag,
    search,
    author,
    featured,
    countryCode = DEFAULT_COUNTRY,
    ids,
    countryTermId,
  } = options

  const extraTags = [
    category ? `category:${category}` : null,
    tag ? `tag:${tag}` : null,
    author ? `author:${author}` : null,
    featured ? "filter:featured" : null,
    search ? `search:${search}` : null,
    ids && ids.length > 0 ? `ids:${ids.map(String).sort().join("-")}` : null,
    typeof countryTermId === "number" ? `country-term:${countryTermId}` : null,
  ]
  const cacheTags = buildCacheTags({ country: countryCode, section: "posts", extra: extraTags })

  const query = wordpressQueries.posts({
    page,
    perPage,
    category,
    tag,
    search,
    author,
    featured,
    ids,
    countryTermId,
  })
  const result = await fetchFromWp<WordPressPost[]>(countryCode, query, {
    withHeaders: true,
    tags: cacheTags,
  })
  const total = Number(result?.headers.get("X-WP-Total") || "0")
  const data = result?.data || []
  return { data, total }
}

export const fetchTags = async (countryCode = DEFAULT_COUNTRY) => {
  try {
    const { endpoint, params } = wordpressQueries.tags()
    const tags = buildCacheTags({ country: countryCode, section: "tags" })
    const result = await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params }, { tags })
    return result || []
  } catch (error) {
    console.error("[v0] Failed to fetch tags during build:", error)
    return []
  }
}

export const fetchSingleTag = async (slug: string, countryCode = DEFAULT_COUNTRY) => {
  const cacheTags = buildCacheTags({ country: countryCode, section: "tags", extra: [`tag:${slug}`] })
  const tags = await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(slug), {
    tags: cacheTags,
  })
  return tags?.[0] || null
}

export const fetchAllTags = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.tags()
  const tags = buildCacheTags({ country: countryCode, section: "tags" })
  return (await fetchFromWp<WordPressTag[]>(countryCode, { endpoint, params }, { tags })) || []
}

export async function fetchPost({
  slug,
  countryCode = DEFAULT_COUNTRY,
  countryTermId,
}: {
  slug: string
  countryCode?: string
  countryTermId?: number
}) {
  const { endpoint, params } = wordpressQueries.postBySlug(slug)
  if (countryTermId) params.countries = countryTermId
  const tags = buildCacheTags({ country: countryCode, section: "post", extra: [`slug:${slug}`] })
  const posts = await fetchFromWp<WordPressPost[]>(
    countryCode,
    {
      endpoint,
      params,
    },
    { tags },
  )
  return posts?.[0] || null
}

export async function resolveCountryTermId(slug: string): Promise<number | null> {
  const base = getRestBase(process.env.NEXT_PUBLIC_DEFAULT_SITE || DEFAULT_COUNTRY)
  const res = await fetch(`${base}/countries?slug=${slug}`)
  if (!res.ok) return null
  const data = await res.json()
  return data?.[0]?.id ?? null
}

export async function getFeaturedPosts(countryCode = DEFAULT_COUNTRY, limit = 10) {
  const cacheTags = buildCacheTags({ country: countryCode, section: "featured", extra: ["tag:featured"] })

  const gqlData = await fetchFromWpGraphQL<FeaturedPostsQuery>(
    countryCode,
    FEATURED_POSTS_QUERY,
    {
      tag: "featured",
      first: limit,
    },
    cacheTags,
  )
  if (gqlData?.posts) {
    const nodes = gqlData.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
    return nodes.map((p) => mapWpPost(p, "gql", countryCode))
  }
  const tags = await executeRestFallback(
    () => fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug("featured"), { tags: cacheTags }),
    `[v0] Featured tag REST fallback failed for ${countryCode}`,
    { countryCode },
    { fallbackValue: [] },
  )
  const tag = tags[0]
  if (!tag) return []
  const { endpoint, params } = wordpressQueries.featuredPosts(tag.id, limit)
  return await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags: cacheTags }),
    `[v0] Featured posts REST fallback failed for ${countryCode}`,
    { countryCode, tagId: tag.id, limit, endpoint, params },
    { fallbackValue: [] },
  )
}

export const fetchCountries = async () => {
  return Object.values(COUNTRIES)
}

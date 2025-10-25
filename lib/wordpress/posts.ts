import { env } from "@/config/env"
import { buildCacheTags } from "../cache/tag-utils"
import { CACHE_DURATIONS } from "../cache/constants"
import {
  COUNTRY_BY_SLUG_QUERY,
  FEATURED_POSTS_QUERY,
  LATEST_POSTS_QUERY,
  POST_CATEGORIES_QUERY,
  POST_BY_SLUG_QUERY,
  POSTS_QUERY,
  RELATED_POSTS_BY_TAGS_QUERY,
  RELATED_POSTS_QUERY,
  TAG_BY_SLUG_QUERY,
  TAGGED_POSTS_QUERY,
  TAGS_QUERY,
} from "../wordpress-queries"
import { fetchWordPressGraphQL, COUNTRIES } from "./client"
import type { WordPressPost } from "@/types/wp"
import type {
  FeaturedPostsQuery,
  LatestPostsQuery,
  PostCategoriesQuery,
  PostFieldsFragment,
  RelatedPostsQuery,
} from "@/types/wpgraphql"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities"
import { DEFAULT_COUNTRY, mapGraphqlTagNode } from "./shared"
import type { PaginatedPostsResult } from "./types"
import type { WordPressTag } from "@/types/wp"
import type { HomePost } from "@/types/home"

const toErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const { message, name, stack } = error
    return { message, name, stack }
  }
  return { error }
}

const MAX_GRAPHQL_BATCH_SIZE = 100

const LATEST_POSTS_REVALIDATE = CACHE_DURATIONS.SHORT
const RELATED_POSTS_REVALIDATE = CACHE_DURATIONS.SHORT
const CATEGORY_LISTING_REVALIDATE = CACHE_DURATIONS.MEDIUM
const TAG_LISTING_REVALIDATE = CACHE_DURATIONS.SHORT
const TAG_INDEX_REVALIDATE = CACHE_DURATIONS.MEDIUM
const POST_DETAIL_REVALIDATE = CACHE_DURATIONS.SHORT
const COUNTRY_LOOKUP_REVALIDATE = CACHE_DURATIONS.LONG
const FEATURED_POSTS_REVALIDATE = CACHE_DURATIONS.MEDIUM

type PostsQueryResult = {
  posts?: {
    nodes?: (PostFieldsFragment | null)[] | null
    pageInfo?: {
      endCursor?: string | null
      hasNextPage?: boolean | null
      offsetPagination?: { total?: number | null } | null
    } | null
  } | null
}

type TagsQueryResult = {
  tags?: {
    nodes?: (
      | {
          databaseId?: number | null
          id?: string | null
          name?: string | null
          slug?: string | null
          count?: number | null
        }
      | null
    )[] | null
  } | null
}

type TagBySlugQueryResult = {
  tag?: {
    databaseId?: number | null
    id?: string | null
    name?: string | null
    slug?: string | null
    count?: number | null
  } | null
}

type PostBySlugQueryResult = {
  posts?: {
    nodes?: (PostFieldsFragment | null)[] | null
  } | null
}

type CountryBySlugQueryResult = {
  countries?: {
    nodes?: (
      | {
          databaseId?: number | null
          slug?: string | null
        }
      | null
    )[] | null
  } | null
}

export async function getLatestPostsForCountry(
  countryCode: string,
  limit = 20,
  cursor?: string | null,
): Promise<PaginatedPostsResult> {
  const tags = buildCacheTags({ country: countryCode, section: "news" })

  try {
    console.log("[v0] Fetching latest posts for:", countryCode)
    const posts: WordPressPost[] = []
    let afterCursor = cursor ?? null
    let lastPageInfo: LatestPostsQuery["posts"]["pageInfo"] | null = null

    while (posts.length < limit) {
      const batchSize = Math.min(MAX_GRAPHQL_BATCH_SIZE, limit - posts.length)
      const variables: { first: number; after?: string } = { first: batchSize }
      if (afterCursor) {
        variables.after = afterCursor
      }

      const gqlData = await fetchWordPressGraphQL<LatestPostsQuery>(
        countryCode,
        LATEST_POSTS_QUERY,
        variables,
        { tags, revalidate: LATEST_POSTS_REVALIDATE },
      )

      if (!gqlData?.posts) {
        break
      }

      const nodes = gqlData.posts.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []
      if (nodes.length > 0) {
        posts.push(...nodes.map((node) => mapGraphqlPostToWordPressPost(node, countryCode)))
      }

      lastPageInfo = gqlData.posts.pageInfo ?? null

      if (!lastPageInfo?.hasNextPage || !lastPageInfo.endCursor || nodes.length === 0) {
        break
      }

      afterCursor = lastPageInfo.endCursor
    }

    return {
      posts: posts.slice(0, limit),
      hasNextPage: lastPageInfo?.hasNextPage ?? false,
      endCursor: lastPageInfo?.endCursor ?? null,
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

  const gqlPost = await fetchWordPressGraphQL<PostCategoriesQuery>(
    countryCode,
    POST_CATEGORIES_QUERY,
    { id: Number(postId) },
    { tags, revalidate: RELATED_POSTS_REVALIDATE },
  )
  if (gqlPost?.post) {
    const catIds =
      gqlPost.post.categories?.nodes
        ?.filter((c): c is NonNullable<typeof c> => typeof c?.databaseId === "number")
        .map((c) => Number(c!.databaseId)) ?? []
    if (catIds.length > 0) {
      const gqlData = await fetchWordPressGraphQL<RelatedPostsQuery>(
        countryCode,
        RELATED_POSTS_QUERY,
        {
          catIds,
          exclude: Number(postId),
          first: limit,
        },
        { tags, revalidate: RELATED_POSTS_REVALIDATE },
      )
      if (gqlData?.posts) {
        const nodes = gqlData.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
        const posts = nodes.map((p) => mapGraphqlPostToWordPressPost(p, countryCode))
        return posts.filter((p) => p.databaseId !== Number(postId))
      }
    }
  }
  return []
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
    const cacheTags = buildCacheTags({
      country,
      section: "related",
      extra: [`post:${postId}`, ...tags.map((tagSlug) => `tag:${tagSlug}`)],
    })
    const gqlData = await fetchWordPressGraphQL<RelatedPostsQuery>(
      country,
      RELATED_POSTS_BY_TAGS_QUERY,
      {
        tagSlugs: tags,
        exclude: Number(postId),
        first: limit,
      },
      { tags: cacheTags, revalidate: RELATED_POSTS_REVALIDATE },
    )

    const nodes = gqlData?.posts?.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
    return nodes
      .map((node) => mapGraphqlPostToWordPressPost(node, country))
      .filter((post) => post.databaseId !== Number(postId) && post.id !== postId)
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

const buildMostReadRequestUrl = (countryCode: string, limit: number, requestUrl?: string) => {
  const params = new URLSearchParams({ country: countryCode })
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    params.set("limit", String(Math.floor(limit)))
  }

  const relativePath = `/api/most-read?${params.toString()}`

  if (typeof window === "undefined") {
    const candidateBases: string[] = []

    const configuredBase = env.NEXT_PUBLIC_SITE_URL?.trim()
    if (configuredBase) {
      candidateBases.push(configuredBase)
    }

    if (requestUrl) {
      try {
        candidateBases.push(new URL(requestUrl).origin)
      } catch (error) {
        console.warn("[v0] Failed to derive request origin for most-read URL", {
          countryCode,
          relativePath,
          requestUrl,
          error: toErrorDetails(error),
        })
      }
    }

    for (const baseUrl of candidateBases) {
      try {
        return new URL(relativePath, baseUrl).toString()
      } catch (error) {
        console.warn("[v0] Failed to build absolute most-read URL", {
          countryCode,
          relativePath,
          baseUrl,
          error: toErrorDetails(error),
        })
      }
    }
  }

  return relativePath
}

interface FetchMostReadPostsOptions {
  requestUrl?: string
}

export const fetchMostReadPosts = async (
  countryCode = DEFAULT_COUNTRY,
  limit = 5,
  options: FetchMostReadPostsOptions = {},
): Promise<HomePost[]> => {
  const requestUrl = buildMostReadRequestUrl(countryCode, limit, options.requestUrl)

  const response = await fetch(requestUrl)
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

export interface FetchTaggedPostsInput {
  slug: string
  after?: string | null
  first?: number
  countryCode?: string
}

export interface FetchTaggedPostsResult {
  nodes: WordPressPost[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
}

export const fetchTaggedPosts = async ({
  slug,
  after = null,
  first = 10,
  countryCode = DEFAULT_COUNTRY,
}: FetchTaggedPostsInput): Promise<FetchTaggedPostsResult> => {
  const cacheTags = buildCacheTags({
    country: countryCode,
    section: "tags",
    extra: [`tag:${slug}`],
  })

  try {
    const gqlData = await fetchWordPressGraphQL<LatestPostsQuery>(
      countryCode,
      TAGGED_POSTS_QUERY,
      {
        tagSlugs: [slug],
        first,
        ...(after ? { after } : {}),
      },
      { tags: cacheTags, revalidate: TAG_LISTING_REVALIDATE },
    )

    if (gqlData?.posts) {
      const nodes =
        gqlData.posts.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []
      const mappedNodes = nodes.map((node) => mapGraphqlPostToWordPressPost(node, countryCode))
      const pageInfo = gqlData.posts.pageInfo
      return {
        nodes: mappedNodes,
        pageInfo: {
          hasNextPage: pageInfo?.hasNextPage ?? false,
          endCursor: pageInfo?.endCursor ?? null,
        },
      }
    }
  } catch (error) {
    console.error("[v0] Failed to fetch tagged posts via GraphQL", {
      slug,
      countryCode,
      error: toErrorDetails(error),
    })
  }

  return {
    nodes: [],
    pageInfo: {
      hasNextPage: false,
      endCursor: null,
    },
  }
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
    const limit = options
    const tags = buildCacheTags({ country: DEFAULT_COUNTRY, section: "news" })
    const { posts } = await getLatestPostsForCountry(DEFAULT_COUNTRY, limit)
    return posts.slice(0, limit)
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

  const offset = Math.max(0, Math.floor(page - 1) * perPage)

  const includeIds = Array.isArray(ids)
    ? ids
        .map((value) => {
          const numeric = Number(value)
          return Number.isNaN(numeric) ? String(value) : numeric
        })
        .filter((value) => value !== undefined && value !== null)
    : undefined

  const authorIds = author
    ? [author]
        .map((value) => {
          const numeric = Number(value)
          return Number.isNaN(numeric) ? String(value) : numeric
        })
        .filter((value) => value !== undefined && value !== null)
    : undefined

  const variables: Record<string, unknown> = {
    first: perPage,
    offset,
  }

  if (category) {
    variables.category = category
  }

  if (tag) {
    variables.tagSlugs = [tag]
  }

  if (search) {
    variables.search = search
  }

  if (authorIds && authorIds.length > 0) {
    variables.authorIds = authorIds
  }

  if (includeIds && includeIds.length > 0) {
    variables.includeIds = includeIds
  }

  if (featured) {
    variables.onlySticky = true
  }

  if (typeof countryTermId === "number") {
    variables.countryTermIds = [countryTermId]
  }

  const gqlData = await fetchWordPressGraphQL<PostsQueryResult>(
    countryCode,
    POSTS_QUERY,
    variables,
    { tags: cacheTags, revalidate: LATEST_POSTS_REVALIDATE },
  )

  const nodes = gqlData?.posts?.nodes?.filter((node): node is PostFieldsFragment => Boolean(node)) ?? []
  const mapped = nodes.map((node) => mapGraphqlPostToWordPressPost(node, countryCode))
  const total = gqlData?.posts?.pageInfo?.offsetPagination?.total ?? mapped.length

  return { data: mapped, total }
}

export const fetchTags = async (countryCode = DEFAULT_COUNTRY) => {
  try {
    const tags = buildCacheTags({ country: countryCode, section: "tags" })
    const gqlData = await fetchWordPressGraphQL<TagsQueryResult>(
      countryCode,
      TAGS_QUERY,
      { first: 100, hideEmpty: true },
      { tags, revalidate: TAG_INDEX_REVALIDATE },
    )

    const nodes = gqlData?.tags?.nodes ?? []
    return nodes
      .map((node) => mapGraphqlTagNode(node))
      .filter((tag): tag is WordPressTag => Boolean(tag))
  } catch (error) {
    console.error("[v0] Failed to fetch tags during build:", error)
    return []
  }
}

export const fetchSingleTag = async (slug: string, countryCode = DEFAULT_COUNTRY) => {
  const cacheTags = buildCacheTags({ country: countryCode, section: "tags", extra: [`tag:${slug}`] })
  const gqlData = await fetchWordPressGraphQL<TagBySlugQueryResult>(
    countryCode,
    TAG_BY_SLUG_QUERY,
    { slug },
    { tags: cacheTags, revalidate: TAG_LISTING_REVALIDATE },
  )

  return mapGraphqlTagNode(gqlData?.tag) ?? null
}

export const fetchAllTags = async (countryCode = DEFAULT_COUNTRY) => {
  const cacheTags = buildCacheTags({ country: countryCode, section: "tags" })
  const gqlData = await fetchWordPressGraphQL<TagsQueryResult>(
    countryCode,
    TAGS_QUERY,
    { first: 100, hideEmpty: true },
    { tags: cacheTags, revalidate: TAG_INDEX_REVALIDATE },
  )

  const nodes = gqlData?.tags?.nodes ?? []
  return nodes
    .map((node) => mapGraphqlTagNode(node))
    .filter((tag): tag is WordPressTag => Boolean(tag))
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
  const tags = buildCacheTags({ country: countryCode, section: "post", extra: [`slug:${slug}`] })
  const variables: Record<string, unknown> = { slug }
  if (typeof countryTermId === "number") {
    variables.countryTermIds = [countryTermId]
  }

  const gqlData = await fetchWordPressGraphQL<PostBySlugQueryResult>(
    countryCode,
    POST_BY_SLUG_QUERY,
    variables,
    { tags, revalidate: POST_DETAIL_REVALIDATE },
  )

  const node = gqlData?.posts?.nodes?.find((value): value is PostFieldsFragment => Boolean(value))
  return node ? mapGraphqlPostToWordPressPost(node, countryCode) : null
}

export async function resolveCountryTermId(slug: string): Promise<number | null> {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) {
    return null
  }

  const countryCode = process.env.NEXT_PUBLIC_DEFAULT_SITE || DEFAULT_COUNTRY
  const cacheTags = buildCacheTags({
    country: countryCode,
    section: "countries",
    extra: [`slug:${normalizedSlug}`],
  })

  try {
    const data = await fetchWordPressGraphQL<CountryBySlugQueryResult>(
      countryCode,
      COUNTRY_BY_SLUG_QUERY,
      { slug: [normalizedSlug] },
      { tags: cacheTags, revalidate: COUNTRY_LOOKUP_REVALIDATE },
    )

    const nodes = data?.countries?.nodes ?? []
    for (const node of nodes) {
      if (!node) {
        continue
      }

      if (typeof node.slug === "string" && node.slug.toLowerCase() === normalizedSlug) {
        const id = node.databaseId
        if (typeof id === "number") {
          return id
        }
      }
    }
  } catch (error) {
    console.error(`[v0] Failed to resolve country term id for ${normalizedSlug}:`, error)
  }

  return null
}

export async function getFeaturedPosts(countryCode = DEFAULT_COUNTRY, limit = 10) {
  const cacheTags = buildCacheTags({ country: countryCode, section: "featured", extra: ["tag:featured"] })

  const gqlData = await fetchWordPressGraphQL<FeaturedPostsQuery>(
    countryCode,
    FEATURED_POSTS_QUERY,
    {
      tag: "featured",
      first: limit,
    },
    { tags: cacheTags, revalidate: FEATURED_POSTS_REVALIDATE },
  )
  if (gqlData?.posts) {
    const nodes = gqlData.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
    return nodes.map((p) => mapGraphqlPostToWordPressPost(p, countryCode))
  }
  return []
}

export const fetchCountries = async () => {
  return Object.values(COUNTRIES)
}

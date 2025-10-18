import * as log from "../log"
import { buildCacheTags } from "../cache/tag-utils"
import { wordpressQueries, FRONT_PAGE_SLICES_QUERY, FP_TAGGED_POSTS_QUERY } from "../wordpress-queries"
import { fetchFromWp, fetchFromWpGraphQL, executeRestFallback } from "./client"
import type { PostFieldsFragment, FpTaggedPostsQuery } from "@/types/wpgraphql"
import type { HomePost } from "@/types/home"
import {
  FP_TAG_SLUG,
  mapGraphqlNodeToHomePost,
  mapPostFromWp,
  mapWordPressPostToHomePost,
} from "./shared"
import type {
  AggregatedHomeData,
  FrontPageSlicesResult,
  PaginatedPostsResult,
  WordPressTag,
} from "./types"
import type { WordPressPost } from "@/types/wp"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { SUPPORTED_COUNTRIES as SUPPORTED_COUNTRY_EDITIONS } from "../editions"

const toErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const { message, name, stack } = error
    return { message, name, stack }
  }
  return { error }
}

type FrontPageSlicesQueryResult = {
  hero?: {
    nodes?: (PostFieldsFragment | null)[] | null
  } | null
  latest?: {
    pageInfo?: {
      endCursor?: string | null
      hasNextPage?: boolean | null
    } | null
    edges?: ({ cursor?: string | null; node?: PostFieldsFragment | null } | null)[] | null
  } | null
}

const FRONT_PAGE_HERO_LIMIT = 8
const FRONT_PAGE_HERO_FALLBACK_LIMIT = 3
const FRONT_PAGE_TRENDING_LIMIT = 7
const FRONT_PAGE_LATEST_LIMIT = 20
const FRONT_PAGE_HERO_TAGS = [FP_TAG_SLUG] as const

const createEmptyFrontPageSlices = (): FrontPageSlicesResult => ({
  hero: { heroPost: undefined, secondaryStories: [] },
  trending: { posts: [], hasNextPage: false, endCursor: null },
  latest: { posts: [], hasNextPage: false, endCursor: null },
})

type BuildFrontPageSlicesOptions = {
  heroPosts: WordPressPost[]
  generalPosts: WordPressPost[]
  heroFallbackLimit: number
  trendingLimit: number
  latestLimit: number
  cursors?: (string | null)[]
  pageInfo?: { endCursor?: string | null; hasNextPage?: boolean | null } | null
}

const buildFrontPageSlices = ({
  heroPosts,
  generalPosts,
  heroFallbackLimit,
  trendingLimit,
  latestLimit,
  cursors,
  pageInfo,
}: BuildFrontPageSlicesOptions): FrontPageSlicesResult => {
  const heroFallback = generalPosts.slice(0, heroFallbackLimit)
  const heroSource = heroPosts.length > 0 ? heroPosts : heroFallback
  const heroPost = heroSource[0]
  const secondaryStories = heroSource.slice(1, 5)

  const trendingPosts = generalPosts.slice(heroFallbackLimit, heroFallbackLimit + trendingLimit)
  const latestPosts = generalPosts.slice(
    heroFallbackLimit + trendingLimit,
    heroFallbackLimit + trendingLimit + latestLimit,
  )

  const trendingEndIndex = heroFallbackLimit + trendingPosts.length - 1
  const latestEndIndex = heroFallbackLimit + trendingLimit + latestPosts.length - 1

  const safeCursorAt = (index: number) => {
    if (!cursors || index < 0) {
      return null
    }
    return cursors[index] ?? null
  }

  const trendingEndCursor = trendingPosts.length > 0 ? safeCursorAt(trendingEndIndex) : null
  const latestEndCursor = latestPosts.length > 0 ? safeCursorAt(latestEndIndex) : null

  const totalGeneral = generalPosts.length
  const consumedForTrending = heroFallbackLimit + trendingPosts.length
  const consumedForLatest = consumedForTrending + latestPosts.length

  const trendingHasNextPage = totalGeneral > consumedForTrending || Boolean(pageInfo?.hasNextPage)
  const latestHasNextPage = totalGeneral > consumedForLatest || Boolean(pageInfo?.hasNextPage)

  return {
    hero: { heroPost, secondaryStories },
    trending: {
      posts: trendingPosts,
      hasNextPage: trendingHasNextPage,
      endCursor: trendingEndCursor ?? pageInfo?.endCursor ?? null,
    },
    latest: {
      posts: latestPosts,
      hasNextPage: latestHasNextPage,
      endCursor: latestEndCursor ?? pageInfo?.endCursor ?? null,
    },
  }
}

const fetchFrontPageSlicesViaRest = async (
  countryCode: string,
  {
    heroFallbackLimit,
    trendingLimit,
    latestLimit,
  }: { heroFallbackLimit: number; trendingLimit: number; latestLimit: number },
  tags: string[],
): Promise<FrontPageSlicesResult> => {
  const totalLatest = heroFallbackLimit + trendingLimit + latestLimit

  try {
    const { endpoint, params } = wordpressQueries.recentPosts(totalLatest)
    const posts = await executeRestFallback(
      () => fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags }),
      `[v0] Frontpage slices REST fallback failed for ${countryCode}`,
      { countryCode, endpoint, params },
      { fallbackValue: [] },
    )

    const mapped = posts.map((post) => mapPostFromWp(post, countryCode))
    return buildFrontPageSlices({
      heroPosts: [],
      generalPosts: mapped,
      heroFallbackLimit,
      trendingLimit,
      latestLimit,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch frontpage slices via REST:", error)
    return createEmptyFrontPageSlices()
  }
}

export async function getFrontPageSlicesForCountry(
  countryCode: string,
  options?: {
    heroLimit?: number
    heroFallbackLimit?: number
    trendingLimit?: number
    latestLimit?: number
  },
): Promise<FrontPageSlicesResult> {
  const heroLimit = options?.heroLimit ?? FRONT_PAGE_HERO_LIMIT
  const heroFallbackLimit = options?.heroFallbackLimit ?? FRONT_PAGE_HERO_FALLBACK_LIMIT
  const trendingLimit = options?.trendingLimit ?? FRONT_PAGE_TRENDING_LIMIT
  const latestLimit = options?.latestLimit ?? FRONT_PAGE_LATEST_LIMIT

  const totalLatest = heroFallbackLimit + trendingLimit + latestLimit
  const tags = buildCacheTags({
    country: countryCode,
    section: "frontpage",
    extra: ["batched"],
  })

  try {
    console.log("[v0] Fetching frontpage slices for:", countryCode)

    const gqlData = await fetchFromWpGraphQL<FrontPageSlicesQueryResult>(
      countryCode,
      FRONT_PAGE_SLICES_QUERY,
      {
        heroFirst: heroLimit,
        heroTagSlugs: FRONT_PAGE_HERO_TAGS,
        latestFirst: totalLatest,
      },
      tags,
    )

    if (gqlData) {
      const heroNodes = gqlData.hero?.nodes?.filter((node): node is PostFieldsFragment => Boolean(node)) ?? []
      const heroPosts = heroNodes.map((node) => mapGraphqlPostToWordPressPost(node, countryCode))

      const latestEdges =
        gqlData.latest?.edges?.filter((edge): edge is { cursor?: string | null; node: PostFieldsFragment } =>
          Boolean(edge?.node),
        ) ?? []

      const generalPosts = latestEdges.map((edge) => mapGraphqlPostToWordPressPost(edge.node, countryCode))
      const cursors = latestEdges.map((edge) => edge.cursor ?? null)

      if (heroPosts.length > 0 || generalPosts.length > 0) {
        return buildFrontPageSlices({
          heroPosts,
          generalPosts,
          heroFallbackLimit,
          trendingLimit,
          latestLimit,
          cursors,
          pageInfo: gqlData.latest?.pageInfo ?? null,
        })
      }
    }

    console.log("[v0] GraphQL returned no data for frontpage slices, falling back to REST")
  } catch (error) {
    console.error("[v0] Failed to fetch frontpage slices via GraphQL:", error)
  }

  return fetchFrontPageSlicesViaRest(countryCode, { heroFallbackLimit, trendingLimit, latestLimit }, tags)
}

export async function getFpTaggedPostsForCountry(countryCode: string, limit = 8): Promise<HomePost[]> {
  const tags = buildCacheTags({ country: countryCode, section: "frontpage", extra: [`tag:${FP_TAG_SLUG}`] })

  try {
    console.log("[v0] Fetching FP tagged posts for:", countryCode)

    const gqlData = await fetchFromWpGraphQL<FpTaggedPostsQuery>(
      countryCode,
      FP_TAGGED_POSTS_QUERY,
      {
        tagSlugs: [FP_TAG_SLUG],
        first: limit,
      },
      tags,
    )

    const nodes = gqlData?.posts?.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node))
    if (nodes && nodes.length > 0) {
      console.log("[v0] Found", nodes.length, "FP tagged posts via GraphQL")
      return nodes.map((node) => mapGraphqlNodeToHomePost(node, countryCode))
    }

    console.log("[v0] No GraphQL results, trying REST fallback")

    try {
      const tagResult = await fetchFromWp<WordPressTag[]>(countryCode, wordpressQueries.tagBySlug(FP_TAG_SLUG), {
        tags,
      })

      if (!tagResult || !Array.isArray(tagResult) || tagResult.length === 0) {
        console.log("[v0] No FP tag found")
        return []
      }

      const tag = tagResult[0]
      const { endpoint, params } = wordpressQueries.postsByTag(tag.id, limit)
      const posts = await fetchFromWp<WordPressPost[]>(countryCode, { endpoint, params }, { tags })

      if (!posts || !Array.isArray(posts)) {
        console.log("[v0] No FP tagged posts found via REST")
        return []
      }

      const normalizedPosts = posts.map((post) =>
        mapWordPressPostToHomePost(mapPostFromWp(post, countryCode), countryCode),
      )

      console.log("[v0] Found", normalizedPosts.length, "FP tagged posts via REST")
      return normalizedPosts
    } catch (restError) {
      console.error("[v0] REST fallback failed for FP tagged posts:", restError)
      return []
    }
  } catch (error) {
    console.error("[v0] Failed to fetch FP tagged posts:", error)
    return []
  }
}

const getPostTimestamp = (post: HomePost): number => {
  const timestamp = new Date(post.date).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export async function getAggregatedLatestHome(limitPerCountry = 6): Promise<AggregatedHomeData> {
  const fallback: AggregatedHomeData = {
    heroPost: null,
    secondaryPosts: [],
    remainingPosts: [],
  }

  try {
    const results = await Promise.allSettled(
      SUPPORTED_COUNTRY_EDITIONS.map((country) =>
        getFpTaggedPostsForCountry(country.code, limitPerCountry),
      ),
    )

    const aggregatedPosts: HomePost[] = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        aggregatedPosts.push(...result.value)
      } else {
        const failedCountry = SUPPORTED_COUNTRY_EDITIONS[index]
        log.error("[v0] Failed to fetch aggregated latest posts", {
          country: failedCountry?.code,
          error: result.reason instanceof Error ? result.reason.message : result.reason,
        })
      }
    })

    if (aggregatedPosts.length === 0) {
      return fallback
    }

    aggregatedPosts.sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))

    const uniquePosts: HomePost[] = []
    const seen = new Set<string>()

    for (const post of aggregatedPosts) {
      const key = post.globalRelayId ?? `${post.country ?? ""}:${post.slug}`
      if (!seen.has(key)) {
        seen.add(key)
        uniquePosts.push(post)
      }
    }

    const heroPost = uniquePosts[0] ?? null
    const secondaryPosts = uniquePosts.slice(1, 4)
    const remainingPosts = uniquePosts.slice(4)

    return {
      heroPost,
      secondaryPosts,
      remainingPosts,
    }
  } catch (error) {
    log.error("[v0] Aggregated latest posts request failed", error)
    return fallback
  }
}

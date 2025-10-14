import "server-only"

import { buildCacheTags } from "@/lib/cache/tag-utils"
import {
  AFRICAN_EDITION,
  isAfricanEdition,
  isCountryEdition,
  type SupportedEdition,
} from "@/lib/editions"
import { SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import {
  getAggregatedLatestHome,
  getFpTaggedPostsForCountry,
  getFrontPageSlicesForCountry,
  mapWordPressPostToHomePost,
  type AggregatedHomeData,
  type WordPressPost,
} from "@/lib/wordpress-api"
import type { Category } from "@/types/content"
import type { CountryPosts, HomePost } from "@/types/home"

export const HOME_FEED_REVALIDATE = 60
const HOME_FEED_FALLBACK_LIMIT = 6

const createEmptyAggregatedHome = (): AggregatedHomeData => ({
  heroPost: null,
  secondaryPosts: [],
  remainingPosts: [],
})

const createHomePostKey = (post: HomePost): string => {
  if (post.globalRelayId) {
    return post.globalRelayId
  }

  if (post.id) {
    return `${post.country ?? ""}:${post.id}`
  }

  if (post.slug) {
    return `${post.country ?? ""}:${post.slug}`
  }

  return JSON.stringify({
    title: post.title,
    date: post.date,
  })
}

const dedupeHomePosts = (posts: HomePost[]): HomePost[] => {
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

const buildAggregatedHomeFromPosts = (posts: HomePost[]): AggregatedHomeData => {
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

export const HOME_FEED_CACHE_TAGS = buildCacheTags({
  section: "home-feed",
  extra: ["tag:home-feed"],
})

const inflightRequests = new Map<string, Promise<AggregatedHomeData>>()
const countryInflightRequests = new Map<string, Promise<AggregatedHomeData>>()

const buildCacheKey = (baseUrl: string, cacheTags: string[]): string => {
  const normalizedTags = Array.from(new Set(cacheTags)).sort()
  return `${baseUrl}|${normalizedTags.join("|")}`
}

const hasAggregatedHomeContent = ({
  heroPost,
  secondaryPosts,
  remainingPosts,
}: AggregatedHomeData): boolean =>
  Boolean(heroPost || secondaryPosts.length > 0 || remainingPosts.length > 0)

const FEATURED_POST_LIMIT = 6
const TAGGED_POST_LIMIT = 8
const RECENT_POST_LIMIT = 10

const mapFrontPageSlicesToHomePosts = (
  countryCode: string,
  slices: Awaited<ReturnType<typeof getFrontPageSlicesForCountry>>,
): HomePost[] => {
  const posts: HomePost[] = []

  const pushPost = (post: WordPressPost | null | undefined) => {
    if (!post) {
      return
    }

    posts.push(mapWordPressPostToHomePost(post, countryCode))
  }

  pushPost(slices.hero?.heroPost)

  if (slices.hero?.secondaryStories?.length) {
    slices.hero.secondaryStories.forEach(pushPost)
  }

  if (slices.trending?.posts?.length) {
    slices.trending.posts.forEach(pushPost)
  }

  if (slices.latest?.posts?.length) {
    slices.latest.posts.forEach(pushPost)
  }

  return dedupeHomePosts(posts)
}

async function fetchAggregatedHomeUncached(
  baseUrl: string,
  cacheTags: string[],
): Promise<AggregatedHomeData> {
  try {
    const aggregated = await getAggregatedLatestHome(HOME_FEED_FALLBACK_LIMIT)

    if (hasAggregatedHomeContent(aggregated)) {
      return aggregated
    }

    console.warn("[v0] Direct WordPress aggregation returned no content, falling back to API", {
      baseUrl,
      cacheTags,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch aggregated home feed from WordPress", {
      error,
      baseUrl,
      cacheTags,
    })
  }

  const endpoint = new URL("/api/home-feed", baseUrl)

  try {
    const response = await fetch(endpoint, {
      next: { tags: cacheTags, revalidate: HOME_FEED_REVALIDATE },
    })

    if (response.ok) {
      const data = (await response.json()) as AggregatedHomeData | null

      if (data && hasAggregatedHomeContent(data)) {
        return data
      }

      console.warn("[v0] Home feed API returned an empty payload", {
        endpoint: endpoint.toString(),
      })
    } else {
      console.error("[v0] Home feed API request failed", {
        endpoint: endpoint.toString(),
        status: response.status,
        statusText: response.statusText,
      })
    }
  } catch (error) {
    console.error("[v0] Failed to fetch home feed via API route", {
      error,
      endpoint: endpoint.toString(),
    })
  }

  return createEmptyAggregatedHome()
}

export function fetchAggregatedHome(
  baseUrl: string,
  cacheTags: string[],
): Promise<AggregatedHomeData> {
  const cacheKey = buildCacheKey(baseUrl, cacheTags)
  const existing = inflightRequests.get(cacheKey)
  if (existing) {
    return existing
  }

  const request = fetchAggregatedHomeUncached(baseUrl, cacheTags).finally(() => {
    inflightRequests.delete(cacheKey)
  })

  inflightRequests.set(cacheKey, request)
  return request
}

const buildCountryCacheKey = (countryCode: string, limit: number) =>
  `${countryCode}|${limit}`

async function fetchAggregatedHomeForCountryUncached(
  countryCode: string,
  limit = HOME_FEED_FALLBACK_LIMIT,
): Promise<AggregatedHomeData> {
  try {
    const frontPageSlices = await getFrontPageSlicesForCountry(countryCode, {
      heroLimit: Math.max(limit, FEATURED_POST_LIMIT),
      heroFallbackLimit: Math.max(3, Math.min(limit, FEATURED_POST_LIMIT)),
      trendingLimit: Math.max(limit, FEATURED_POST_LIMIT),
      latestLimit: Math.max(RECENT_POST_LIMIT, limit * 2),
    })

    const frontPagePosts = mapFrontPageSlicesToHomePosts(countryCode, frontPageSlices)
    const aggregatedFromSlices = buildAggregatedHomeFromPosts(frontPagePosts)

    if (hasAggregatedHomeContent(aggregatedFromSlices)) {
      return aggregatedFromSlices
    }

    console.warn(
      `[v0] Frontpage slices returned no content for ${countryCode}, falling back to fp-tag`,
    )
  } catch (error) {
    console.error(
      `[v0] Failed to assemble home feed for country ${countryCode} from frontpage slices`,
      { error },
    )
  }

  try {
    const fpTaggedPosts = await getFpTaggedPostsForCountry(countryCode, Math.max(limit, TAGGED_POST_LIMIT))

    const aggregatedFromTags = buildAggregatedHomeFromPosts(fpTaggedPosts)

    if (hasAggregatedHomeContent(aggregatedFromTags)) {
      return aggregatedFromTags
    }

    console.warn(
      `[v0] FP tag fallback returned no content for ${countryCode}, using empty aggregated home`,
    )
  } catch (error) {
    console.error(`[v0] Failed to assemble home feed for country ${countryCode} from fp-tag`, {
      error,
    })
  }

  return createEmptyAggregatedHome()
}

export function fetchAggregatedHomeForCountry(
  countryCode: string,
  limit = HOME_FEED_FALLBACK_LIMIT,
): Promise<AggregatedHomeData> {
  const cacheKey = buildCountryCacheKey(countryCode, limit)
  const existing = countryInflightRequests.get(cacheKey)
  if (existing) {
    return existing
  }

  const request = fetchAggregatedHomeForCountryUncached(countryCode, limit).finally(() => {
    countryInflightRequests.delete(cacheKey)
  })

  countryInflightRequests.set(cacheKey, request)
  return request
}

export type { AggregatedHomeData } from "@/lib/wordpress-api"

const flattenAggregatedHome = ({
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

type HomeContentInitialData = {
  taggedPosts: HomePost[]
  featuredPosts: HomePost[]
  categories: Category[]
  recentPosts: HomePost[]
}

const buildInitialDataFromPosts = (posts: HomePost[]): HomeContentInitialData => {
  const taggedPosts = posts.slice(0, TAGGED_POST_LIMIT)
  const featuredPosts = posts.slice(0, FEATURED_POST_LIMIT)
  const recentPosts = posts.slice(0, RECENT_POST_LIMIT)

  return {
    taggedPosts,
    featuredPosts,
    categories: [] as Category[],
    recentPosts,
  }
}

export interface HomeContentServerProps {
  initialPosts: HomePost[]
  featuredPosts: HomePost[]
  countryPosts: CountryPosts
  initialData: HomeContentInitialData
}

const deriveHomeContentState = (
  aggregatedHome: AggregatedHomeData,
): Omit<HomeContentServerProps, "countryPosts"> => {
  const initialPosts = flattenAggregatedHome(aggregatedHome)
  const featuredPosts = initialPosts.slice(0, FEATURED_POST_LIMIT)
  const initialData = buildInitialDataFromPosts(initialPosts)

  return {
    initialPosts,
    featuredPosts,
    initialData,
  }
}

const buildCountryPosts = async (
  countryCodes: readonly string[],
  preloaded: Partial<Record<string, AggregatedHomeData>> = {},
): Promise<CountryPosts> => {
  if (!countryCodes.length) {
    return {}
  }

  const countryEntries = await Promise.all(
    countryCodes.map(async (countryCode) => {
      const aggregated =
        preloaded[countryCode] ?? (await fetchAggregatedHomeForCountry(countryCode))
      const posts = flattenAggregatedHome(aggregated)
      return [countryCode, posts] as const
    }),
  )

  return countryEntries.reduce<CountryPosts>((acc, [countryCode, posts]) => {
    acc[countryCode] = posts
    return acc
  }, {})
}

export async function buildHomeContentProps(baseUrl: string): Promise<HomeContentServerProps> {
  const aggregatedHome = await fetchAggregatedHome(baseUrl, HOME_FEED_CACHE_TAGS)
  const { initialPosts, featuredPosts, initialData } = deriveHomeContentState(aggregatedHome)

  const countryPosts = await buildCountryPosts(SUPPORTED_COUNTRIES)

  return {
    initialPosts,
    featuredPosts,
    countryPosts,
    initialData,
  }
}

export async function buildHomeContentPropsForEdition(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeContentServerProps> {
  const aggregatedHome = isAfricanEdition(edition)
    ? await fetchAggregatedHome(baseUrl, HOME_FEED_CACHE_TAGS)
    : await fetchAggregatedHomeForCountry(edition.code)

  const { initialPosts, featuredPosts, initialData } = deriveHomeContentState(aggregatedHome)

  const countryPosts = isCountryEdition(edition)
    ? await buildCountryPosts([edition.code], { [edition.code]: aggregatedHome })
    : { [AFRICAN_EDITION.code]: initialPosts }

  return {
    initialPosts,
    featuredPosts,
    countryPosts,
    initialData,
  }
}

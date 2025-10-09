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
  type AggregatedHomeData,
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

const buildAggregatedHomeFromPosts = (posts: HomePost[]): AggregatedHomeData => {
  if (posts.length === 0) {
    return createEmptyAggregatedHome()
  }

  const [heroPost, ...rest] = posts

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

const buildCacheKey = (baseUrl: string, cacheTags: string[]): string => {
  const normalizedTags = Array.from(new Set(cacheTags)).sort()
  return `${baseUrl}|${normalizedTags.join("|")}`
}

async function fetchAggregatedHomeUncached(
  baseUrl: string,
  cacheTags: string[],
): Promise<AggregatedHomeData> {
  try {
    return await getAggregatedLatestHome(HOME_FEED_FALLBACK_LIMIT)
  } catch (error) {
    console.error("Failed to fetch home feed", { error, baseUrl, cacheTags })
    return createEmptyAggregatedHome()
  }
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

export async function fetchAggregatedHomeForCountry(
  countryCode: string,
  limit = HOME_FEED_FALLBACK_LIMIT,
): Promise<AggregatedHomeData> {
  try {
    const fpTaggedPosts = await getFpTaggedPostsForCountry(countryCode, limit)

    return buildAggregatedHomeFromPosts(fpTaggedPosts)
  } catch (error) {
    console.error(`[v0] Failed to assemble home feed for country ${countryCode}`, { error })
    return createEmptyAggregatedHome()
  }
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

const FEATURED_POST_LIMIT = 6
const TAGGED_POST_LIMIT = 8
const RECENT_POST_LIMIT = 10

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

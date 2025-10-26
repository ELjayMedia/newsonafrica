import "server-only"

import { cache } from "react"
import pLimit from "p-limit"

import { buildCacheTags } from "@/lib/cache/tag-utils"
import { categoryConfigs, homePageConfig } from "@/config/homeConfig"
import {
  AFRICAN_EDITION,
  isAfricanEdition,
  isCountryEdition,
  type SupportedEdition,
} from "@/lib/editions"
import { DEFAULT_COUNTRY, SUPPORTED_COUNTRIES } from "@/lib/utils/routing"
import {
  getAggregatedLatestHome,
  getFpTaggedPostsForCountry,
  getFrontPageSlicesForCountry,
  mapWordPressPostToHomePost,
  type AggregatedHomeData,
  type WordPressPost,
} from "@/lib/wordpress-api"
import { mapPostsToHomePosts } from "@/lib/wordpress/shared"
import { getPostsForCategories } from "@/lib/wp-server/categories"
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

const normalizeCacheTags = (cacheTags: string[]): string[] =>
  Array.from(new Set(cacheTags)).sort()

const hasAggregatedHomeContent = ({
  heroPost,
  secondaryPosts,
  remainingPosts,
}: AggregatedHomeData): boolean =>
  Boolean(heroPost || secondaryPosts.length > 0 || remainingPosts.length > 0)

const FEATURED_POST_LIMIT = 6
const TAGGED_POST_LIMIT = 8
const RECENT_POST_LIMIT = 10
export const COUNTRY_AGGREGATE_CONCURRENCY = 4

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

async function fetchAggregatedHomeUncached(cacheTags: string[]): Promise<AggregatedHomeData> {
  try {
    const aggregated = await getAggregatedLatestHome(HOME_FEED_FALLBACK_LIMIT)

    if (hasAggregatedHomeContent(aggregated)) {
      return aggregated
    }

    console.warn("[v1] WordPress aggregation returned no content", {
      cacheTags,
    })
  } catch (error) {
    console.error("[v1] Failed to fetch aggregated home feed from WordPress", {
      error,
      cacheTags,
    })
  }

  return createEmptyAggregatedHome()
}

export const fetchAggregatedHome = cache(
  async (cacheTags: string[]): Promise<AggregatedHomeData> => {
    const normalizedTags = normalizeCacheTags(cacheTags)
    return fetchAggregatedHomeUncached(normalizedTags)
  },
)

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

export const fetchAggregatedHomeForCountry = cache(
  async (
    countryCode: string,
    limit = HOME_FEED_FALLBACK_LIMIT,
  ): Promise<AggregatedHomeData> => fetchAggregatedHomeForCountryUncached(countryCode, limit),
)

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
  categoryPosts?: Record<string, HomePost[]>
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
    categoryPosts: {},
  }
}

const configuredCategorySlugs = Array.from(
  new Set(
    categoryConfigs
      .map((config) => (config.typeOverride ?? config.name).toLowerCase())
      .filter((slug) => slug.length > 0),
  ),
)

const CATEGORY_POST_LIMIT = homePageConfig.categorySection?.postsPerCategory ?? 5

const loadCategoryPostsForHome = async (
  countryCode: string,
): Promise<Record<string, HomePost[]>> => {
  if (configuredCategorySlugs.length === 0 || CATEGORY_POST_LIMIT <= 0) {
    return {}
  }

  const results = await getPostsForCategories(countryCode, configuredCategorySlugs, CATEGORY_POST_LIMIT)

  return Object.entries(results).reduce<Record<string, HomePost[]>>((acc, [slug, result]) => {
    const posts = Array.isArray(result?.posts) ? result?.posts : []
    acc[slug] = mapPostsToHomePosts(posts, countryCode)
    return acc
  }, {})
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

interface BuildCountryPostsOptions {
  includeAggregates?: boolean
  includeAfricanAggregate?: boolean
  fetchCountryAggregate?: (countryCode: string) => Promise<AggregatedHomeData>
}

interface BuildCountryPostsResult {
  countryPosts: CountryPosts
  aggregatedByCountry: Record<string, AggregatedHomeData>
  africanAggregate?: AggregatedHomeData
}

export async function buildCountryPosts(
  countryCodes: readonly string[],
  preloaded?: Partial<Record<string, AggregatedHomeData>>,
): Promise<CountryPosts>
export async function buildCountryPosts(
  countryCodes: readonly string[],
  preloaded: Partial<Record<string, AggregatedHomeData>> | undefined,
  options: BuildCountryPostsOptions & { includeAggregates: true },
): Promise<BuildCountryPostsResult>
export async function buildCountryPosts(
  countryCodes: readonly string[],
  preloaded: Partial<Record<string, AggregatedHomeData>> = {},
  options?: BuildCountryPostsOptions,
): Promise<CountryPosts | BuildCountryPostsResult> {
  if (!countryCodes.length) {
    if (options?.includeAggregates) {
      return {
        countryPosts: {},
        aggregatedByCountry: {},
        africanAggregate: options.includeAfricanAggregate
          ? createEmptyAggregatedHome()
          : undefined,
      }
    }

    return {}
  }

  const aggregatedByCountry = new Map<string, AggregatedHomeData>()

  if (preloaded) {
    for (const [countryCode, aggregated] of Object.entries(preloaded)) {
      if (aggregated) {
        aggregatedByCountry.set(countryCode, aggregated)
      }
    }
  }

  const limit = pLimit(COUNTRY_AGGREGATE_CONCURRENCY)
  const fetchCountryAggregate = options?.fetchCountryAggregate ?? fetchAggregatedHomeForCountry
  const pendingCountries = new Set<string>()

  await Promise.all(
    countryCodes.map(async (countryCode) => {
      if (aggregatedByCountry.has(countryCode) || pendingCountries.has(countryCode)) {
        return
      }

      pendingCountries.add(countryCode)

      const aggregated = await limit(() => fetchCountryAggregate(countryCode))
      aggregatedByCountry.set(countryCode, aggregated)
    }),
  )

  const aggregatedEntries = countryCodes.map((countryCode) => {
    const aggregated = aggregatedByCountry.get(countryCode)

    if (!aggregated) {
      const empty = createEmptyAggregatedHome()
      aggregatedByCountry.set(countryCode, empty)
      return [countryCode, empty] as const
    }

    return [countryCode, aggregated] as const
  })

  const countryPosts = aggregatedEntries.reduce<CountryPosts>((acc, [countryCode, aggregated]) => {
    acc[countryCode] = flattenAggregatedHome(aggregated)
    return acc
  }, {})

  if (!options?.includeAggregates) {
    return countryPosts
  }

  const aggregatedByCountryRecord = aggregatedEntries.reduce<
    Record<string, AggregatedHomeData>
  >((acc, [countryCode, aggregated]) => {
    acc[countryCode] = aggregated
    return acc
  }, {})

  const africanAggregate = options.includeAfricanAggregate
    ? buildAggregatedHomeFromPosts(Object.values(countryPosts).flat())
    : undefined

  return {
    countryPosts,
    aggregatedByCountry: aggregatedByCountryRecord,
    africanAggregate,
  }
}

export async function buildHomeContentProps(baseUrl: string): Promise<HomeContentServerProps> {
  const { countryPosts, africanAggregate } =
    (await buildCountryPosts(SUPPORTED_COUNTRIES, {}, {
      includeAggregates: true,
      includeAfricanAggregate: true,
    })) as BuildCountryPostsResult

  const aggregatedFromCountries = africanAggregate ?? createEmptyAggregatedHome()
  const aggregatedHome = hasAggregatedHomeContent(aggregatedFromCountries)
    ? aggregatedFromCountries
    : await fetchAggregatedHome(HOME_FEED_CACHE_TAGS)
  const { initialPosts, featuredPosts, initialData } = deriveHomeContentState(aggregatedHome)

  const categoryPosts = await loadCategoryPostsForHome(DEFAULT_COUNTRY)
  const enrichedInitialData = { ...initialData, categoryPosts }

  return {
    initialPosts,
    featuredPosts,
    countryPosts,
    initialData: enrichedInitialData,
  }
}

export async function buildHomeContentPropsForEdition(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeContentServerProps> {
  const aggregatedHome = isAfricanEdition(edition)
    ? await fetchAggregatedHome(HOME_FEED_CACHE_TAGS)
    : await fetchAggregatedHomeForCountry(edition.code)

  const { initialPosts, featuredPosts, initialData } = deriveHomeContentState(aggregatedHome)

  const countryPosts = isCountryEdition(edition)
    ? await buildCountryPosts([edition.code], { [edition.code]: aggregatedHome })
    : { [AFRICAN_EDITION.code]: initialPosts }

  const categoryCountry = isCountryEdition(edition)
    ? edition.code
    : isAfricanEdition(edition)
      ? AFRICAN_EDITION.code
      : DEFAULT_COUNTRY
  const categoryPosts = await loadCategoryPostsForHome(categoryCountry)
  const enrichedInitialData = { ...initialData, categoryPosts }

  return {
    initialPosts,
    featuredPosts,
    countryPosts,
    initialData: enrichedInitialData,
  }
}

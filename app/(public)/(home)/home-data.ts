import "server-only"
import pLimit from "p-limit"

import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { AFRICAN_EDITION } from "@/lib/editions"
import type { getFrontPageSlicesForCountry, AggregatedHomeData } from "@/lib/wordpress-api"
import type { HomePost } from "@/types/home"

export const HOME_FEED_REVALIDATE = CACHE_DURATIONS.MEDIUM
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

const normalizeCacheTags = (cacheTags: string[]): string[] => Array.from(new Set(cacheTags)).sort()

const hasAggregatedHomeContent = ({ heroPost, secondaryPosts, remainingPosts }: AggregatedHomeData): boolean =>
  Boolean(heroPost || secondaryPosts.length > 0 || remainingPosts.length > 0)

const FEATURED_POST_LIMIT = 6
const TAGGED_POST_LIMIT = 8
const RECENT_POST_LIMIT = 10
export const COUNTRY_AGGREGATE_CONCURRENCY = 4
const homeFeedRequestLimit = pLimit(6)

const scheduleHomeFeedTask = <T>(
  timeoutMs: number,\
  task: (context: { signal: AbortSignal; timeout: number }) => Promise<T>,
): Promise<T> =>
  homeFeedRequestLimit(async () => {\
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {\
      return await task({ signal: controller.signal, timeout: timeoutMs })
    } finally {
      clearTimeout(timeoutId)
    }
  })

const mapFrontPageSlicesToHomePosts = (
  countryCode: string,
  slices: Awaited<ReturnType<typeof getFrontPageSlicesForCountry>>,
): HomePost[] => {\
  const posts: HomePost[] = []

  const pushPost = (post: WordPressPost | null | undefined) => {\
    if (!post) {\
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

async function fetchAggregatedHomeUncached(cacheTags: string[]): Promise<AggregatedHomeData> {\
  try {\
    const aggregated = await loadUnstableCacheAdapter(fetchAggregatedHomeNoCache, cacheTags)()

    if (hasAggregatedHomeContent(aggregated)) {\
      return aggregated
    }
  } catch (error) {
    console.error("[v0] fetchAggregatedHomeUncached error:", error)
  }

  return createEmptyAggregatedHome()
}

const fetchAggregatedHomeNoCache = unstable_cache(
  async (cacheTags: string[]): Promise<AggregatedHomeData> => {\
    return fetchAggregatedHome()
  },
  ["aggregated-home-v1"],
  {\
    tags: [],
    revalidate: CACHE_DURATIONS.MEDIUM,
  },
)

async function fetchAggregatedHome(): Promise<AggregatedHomeData> {\
  return await Promise.all(
    ENABLED_COUNTRY_CODES.map((countryCode) =>
      fetchAggregatedForCountry(countryCode),
    ),
  ).then((results) => {\
    const aggregated: AggregatedHomeData = {}

    results.forEach((result) => {\
      if (result) {
        aggregated[result.countryCode] = result
      }
    })

    return aggregated
  })
}

async function fetchAggregatedForCountry(
  countryCode: string,\
): Promise<AggregatedHomeData[string]> {\
  const defaultTag = DEFAULT_TAGS_BY_COUNTRY[countryCode as CountryCode] || null

  const frontPagePromise = scheduleHomeFeedTask(FRONT_PAGE_TIMEOUT_MS, async ({ signal, timeout }) => {\
    try {\
      const frontPageSlices = await getFrontPageSlicesForCountry(countryCode, {
        signal,
        timeout,
      })

      return {\
        posts: mapFrontPageSlicesToHomePosts(countryCode, frontPageSlices),
        source: "frontpage" as const,
      }
    } catch (error) {\
      if (error instanceof Error && error.name === "AbortError") {
        console.error(
          `[v0] getFrontPageSlicesForCountry timed out after ${timeout}ms for ${countryCode}`,
        )
      } else {
        console.error(
          `[v0] getFrontPageSlicesForCountry error for ${countryCode}:`,
          error,
        )
      }

      return null
    }
  })

  const recentPromise = scheduleHomeFeedTask(RECENT_TIMEOUT_MS, async ({ signal, timeout }) => {\
    try {\
      return await loadPostsByMostRecent(countryCode, {
        signal,
        timeout,
      })
    } catch (error) {
      console.error(`[v0] loadPostsByMostRecent timed out or failed for ${countryCode}:`, error)\
      return []
    }
  })

  const taggedPromise = scheduleHomeFeedTask(TAG_TIMEOUT_MS, async ({ signal, timeout }) => {\
    try {\
      return await loadTagPosts(countryCode, defaultTag, {
        signal,
        timeout,
      })
    } catch (error) {
      console.error(`[v0] loadTagPosts timed out or failed for ${countryCode}:`, error)\
      return []
    }
  })

  const results = await Promise.all([frontPagePromise, recentPromise, taggedPromise])\
  const best = results.reduce<{\
    posts: HomePost[]
    source: string
  }>(
    (acc, result) => {\
      if (!result) {\
        return acc
      }

      if (result.posts.length > acc.posts.length) {
        return result
      }

      return acc
    },
    { posts: [], source: "" },
  )

  return buildAggregatedHomeFromPosts(best.posts)
}

export const fetchAggregatedHomeForCountry = unstable_cache(
  async (
    countryCode: string,
    limit = HOME_FEED_FALLBACK_LIMIT,
  ): Promise<AggregatedHomeData> => fetchAggregatedHomeForCountryUncached(countryCode, limit),
  ["home-feed-for-country"],
  {
    revalidate: HOME_FEED_REVALIDATE,
    tags: buildCacheTags({
      country: countryCode,
      section: "home-feed",
    }),
  },
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
  countryCodes: string[],
  preloaded?: Partial<Record<string, AggregatedHomeData>>,
): Promise<CountryPosts>
export async function buildCountryPosts(
  countryCodes: string[],
  preloaded: Partial<Record<string, AggregatedHomeData>> | undefined,
  options: BuildCountryPostsOptions & { includeAggregates: true },
): Promise<BuildCountryPostsResult>
export async function buildCountryPosts(
  countryCodes: string[],
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

  await Promise.allSettled(
    countryCodes.map(async (countryCode) => {
      if (aggregatedByCountry.has(countryCode) || pendingCountries.has(countryCode)) {
        return
      }

      pendingCountries.add(countryCode)

      try {
        const aggregated = await limit(() => fetchCountryAggregate(countryCode))
        aggregatedByCountry.set(countryCode, aggregated)
      } catch (error) {
        console.error(`Failed to fetch aggregated home feed for country ${countryCode}`, {
          error,
        })
        aggregatedByCountry.set(countryCode, createEmptyAggregatedHome())
      } finally {
        pendingCountries.delete(countryCode)
      }
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

async function buildHomeContentPropsUncached(
  _baseUrl: string,
): Promise<HomeContentServerProps> {
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

async function buildHomeContentPropsForEditionUncached(
  _baseUrl: string,
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
  const categoryPostsResult = await loadCategoryPostsForHome(categoryCountry)
  const enrichedInitialData = { ...initialData, categoryPosts: categoryPostsResult }

  return {
    initialPosts,
    featuredPosts,
    countryPosts,
    initialData: enrichedInitialData,
  }
}

const mergeTags = (
  ...tagGroups: Array<readonly string[] | string[] | undefined>
): string[] => {
  const set = new Set<string>()
  for (const group of tagGroups) {
    if (!group) continue
    for (const tag of group) {
      if (tag) {
        set.add(tag)
      }
    }
  }

  return Array.from(set)
}

type HomeContentFetcher = (_baseUrl: string) => Promise<HomeContentServerProps>

const isNextCacheUnavailableError = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      (error as { digest?: unknown }).digest === "E469",
  )

const shouldUseFallbackCache =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST))

const createCachedFetcher = (
  keyParts: string[],
  tags: readonly string[] | string[],
  fn: HomeContentFetcher,
): HomeContentFetcher => {
  if (shouldUseFallbackCache) {
    const fallbackStore = new Map<string, Promise<HomeContentServerProps>>()

    return async (_baseUrl: string) => {
      const fallbackKey = JSON.stringify([keyParts, _baseUrl])

      if (!fallbackStore.has(fallbackKey)) {
        fallbackStore.set(fallbackKey, fn(_baseUrl))
      }

      return fallbackStore.get(fallbackKey)!
    }
  }

  const cached = unstable_cache(fn, keyParts, {
    revalidate: HOME_FEED_REVALIDATE,
    tags,
  })

  return async (_baseUrl: string) => {
    try {
      return await cached(_baseUrl)
    } catch (error) {
      if (isNextCacheUnavailableError(error)) {
        return fn(_baseUrl)
      }

      throw error
    }
  }
}

const cachedBuildHomeContentProps = createCachedFetcher(
  ["home-content", "default"],
  HOME_FEED_CACHE_TAGS,
  buildHomeContentPropsUncached,
)

const editionCache = new Map<string, HomeContentFetcher>()

const getEditionCache = (edition: SupportedEdition) => {
  const cacheKey = edition.code
  let cached = editionCache.get(cacheKey)

  if (!cached) {
    const editionTags = buildCacheTags({
      country: isCountryEdition(edition) ? edition.code : undefined,
      section: "home-feed",
      extra: [
        `edition:${edition.code}`,
        isAfricanEdition(edition) ? "edition:africa" : undefined,
      ],
    })

    cached = createCachedFetcher(
      ["home-content", cacheKey],
      mergeTags(HOME_FEED_CACHE_TAGS, editionTags),
      async (_baseUrl: string) =>
        buildHomeContentPropsForEditionUncached(_baseUrl, edition),
    )

    editionCache.set(cacheKey, cached)
  }

  return cached
}

export async function buildHomeContentProps(
  _baseUrl: string,
): Promise<HomeContentServerProps> {
  return cachedBuildHomeContentProps(_baseUrl)
}

export async function buildHomeContentPropsForEdition(
  _baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeContentServerProps> {
  const cached = getEditionCache(edition)
  return cached(_baseUrl)
}

// Helper functions assumed to be defined elsewhere
async function getAggregatedLatestHome(limit: number): Promise<AggregatedHomeData> {
  // Implementation here
}

async function getFrontPageSlicesForCountry(countryCode: string, options: any): Promise<any> {
  // Implementation here
}

async function getLatestPostsForCountry(countryCode: string, limit: number, offset: any, options: any): Promise<any> {
  // Implementation here
}

async function getFpTaggedPostsForCountry(countryCode: string, limit: number, options: any): Promise<any> {
  // Implementation here
}

function mapWordPressPostToHomePost(post: WordPressPost, countryCode: string): HomePost {
  // Implementation here
}

function mapPostsToHomePosts(posts: WordPressPost[], countryCode: string): HomePost[] {
  // Implementation here
}

function getPostsForCategories(countryCode: string, categorySlugs: string[], limit: number): Promise<any> {
  // Implementation here
}

async function loadPostsByMostRecent(countryCode: string, options: any): Promise<any> {
  // Implementation here
}

async function loadTagPosts(countryCode: string, tag: string, options: any): Promise<any> {
  // Implementation here
}

async function loadUnstableCacheAdapter(fn: any, cacheTags: string[]): Promise<any> {
  // Implementation here
}

// Types assumed to be defined elsewhere
type WordPressPost = any
type Category = any
type CountryPosts = any
type SupportedEdition = any
const SUPPORTED_COUNTRIES = [] as string[]
const DEFAULT_COUNTRY = ""
const categoryConfigs = [] as any[]
const homePageConfig = {} as any
const ENABLED_COUNTRY_CODES = [] as string[]
const DEFAULT_TAGS_BY_COUNTRY = {} as any
const COUNTRY_CODES = [] as string[]
const MAX_AGGREGATED_HOME_COUNTRY_REQUESTS = 4
const defaultTag = ""
const FEED_BUILDER_POOL_SIZE = 10
const isAfricanEdition = (edition: SupportedEdition) => edition.code === AFRICAN_EDITION.code
const isCountryEdition = (edition: SupportedEdition) => edition.code !== AFRICAN_EDITION.code
const unstable_cache = (fn: any, keyParts: string[], options: any) => fn
const loadUnstableCacheAdapter = (fn: any, cacheTags: string[]) => fn

const FRONT_PAGE_TIMEOUT_MS = 2500
const RECENT_TIMEOUT_MS = 1200
const TAG_TIMEOUT_MS = 900

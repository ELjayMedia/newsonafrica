import "server-only"
import { CACHE_DURATIONS, CACHE_TAGS } from "@/lib/cache/constants"
import { appConfig } from "@/lib/config"
import {
  createHomePostKey,
  dedupeHomePosts,
  createEmptyAggregatedHome,
  buildAggregatedHomeFromPosts,
  hasAggregatedHomeContent,
  flattenAggregatedHome,
} from "@/lib/utils/posts"
import { getUnstableCache, createCachedFetcher } from "@/lib/utils/cache"
import { createTaskScheduler } from "@/lib/utils/async"
import type { getFrontPageSlicesForCountry, AggregatedHomeData } from "@/lib/wordpress-api"
import type { HomePost } from "@/types/home"

// Derive all constants from centralized config
const { home: homeConfig, countries: countryConfig } = appConfig

export const HOME_FEED_REVALIDATE = CACHE_DURATIONS.MEDIUM

// Limits derived from config
const {
  featured: FEATURED_POST_LIMIT,
  tagged: TAGGED_POST_LIMIT,
  recent: RECENT_POST_LIMIT,
  fallback: HOME_FEED_FALLBACK_LIMIT,
  categoryPosts: CATEGORY_POST_LIMIT,
} = homeConfig.limits

// Timeouts derived from config
const {
  frontPage: FRONT_PAGE_TIMEOUT_MS,
  recent: RECENT_TIMEOUT_MS,
  tag: TAG_TIMEOUT_MS,
} = homeConfig.timeouts

// Concurrency from config
const COUNTRY_AGGREGATE_CONCURRENCY = homeConfig.concurrency

// Country settings from config
const ENABLED_COUNTRY_CODES = countryConfig.supported
const SUPPORTED_COUNTRIES = countryConfig.supported
const DEFAULT_COUNTRY = countryConfig.default

// Edition from config
const AFRICAN_EDITION = homeConfig.editions.african

// Tags from config
const DEFAULT_TAGS_BY_COUNTRY = homeConfig.defaultTagsByCountry

// Post utilities imported from @/lib/utils/posts
// Cache utilities imported from @/lib/utils/cache

// Task scheduler from @/lib/utils/async
const scheduleHomeFeedTask = createTaskScheduler(COUNTRY_AGGREGATE_CONCURRENCY)

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

async function fetchAggregatedForCountry(
  countryCode: string,
): Promise<AggregatedHomeData> {
  const defaultTag = DEFAULT_TAGS_BY_COUNTRY[countryCode] || null

  const frontPagePromise = scheduleHomeFeedTask(FRONT_PAGE_TIMEOUT_MS, async ({ signal, timeout }) => {
    try {
      const frontPageSlices = await getFrontPageSlicesForCountry(countryCode, {
        signal,
        timeout,
      })

      return {
        posts: mapFrontPageSlicesToHomePosts(countryCode, frontPageSlices),
        source: "frontpage" as const,
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.debug(
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

  const recentPromise = scheduleHomeFeedTask(RECENT_TIMEOUT_MS, async ({ signal, timeout }) => {
    try {
      return await loadPostsByMostRecent(countryCode, {
        signal,
        timeout,
      })
    } catch (error) {
      console.debug(`[v0] loadPostsByMostRecent timed out or failed for ${countryCode}:`, error)
      return []
    }
  })

  const taggedPromise = scheduleHomeFeedTask(TAG_TIMEOUT_MS, async ({ signal, timeout }) => {
    try {
      return await loadTagPosts(countryCode, defaultTag, {
        signal,
        timeout,
      })
    } catch (error) {
      console.debug(`[v0] loadTagPosts timed out or failed for ${countryCode}:`, error)
      return []
    }
  })

  const results = await Promise.all([frontPagePromise, recentPromise, taggedPromise])
  
  const scored = results.map((result) => {
    if (!result) return { score: -1, result: null }
    
    const sourceWeight = result.source === "frontpage" ? 1000 : result.source === "tagged" ? 500 : 0
    return {
      score: sourceWeight + result.posts.length,
      result,
    }
  })

  const best = scored.reduce((acc, curr) =>
    curr.score > acc.score ? curr : acc,
    { score: -1, result: null as any },
  )

  return buildAggregatedHomeFromPosts(best.result?.posts ?? [])
}

async function fetchAggregatedHome(): Promise<AggregatedHomeData> {
  return await Promise.all(
    ENABLED_COUNTRY_CODES.map((countryCode) =>
      fetchAggregatedForCountry(countryCode),
    ),
  ).then((results) => {
    const aggregated: AggregatedHomeData = {}

    results.forEach((result) => {
      if (result) {
        aggregated[result.countryCode] = result
      }
    })

    return aggregated
  })
}

async function fetchAggregatedHomeForCountry(
  countryCode: string,
  limit = HOME_FEED_FALLBACK_LIMIT,
): Promise<AggregatedHomeData> {
  const unstableCache = await getUnstableCache()
  
  const cached = unstableCache(
    async () => {
      const defaultTag = DEFAULT_TAGS_BY_COUNTRY[countryCode] || null
      return await Promise.resolve(createEmptyAggregatedHome())
    },
    ["home-feed-for-country", countryCode, String(limit)],
    {
      revalidate: HOME_FEED_REVALIDATE,
      tags: [cacheTags.home(countryCode), cacheTags.edition(countryCode)],
    }
  )
  
  return cached()
}

export type { AggregatedHomeData } from "@/lib/wordpress-api"

// flattenAggregatedHome imported from @/lib/utils/posts

type HomeContentInitialData = {
  taggedPosts: HomePost[]
  featuredPosts: HomePost[]
  categories: Category[]
  recentPosts: HomePost[]
  categoryPosts?: Record<string, HomePost[]>
}

type Category = Awaited<ReturnType<typeof getCategoriesForCountry>>[number]
type CountryPosts = Record<string, HomePost[]>

// DEFAULT_TAGS_BY_COUNTRY is now derived from appConfig at the top of the file

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

const mapWordPressPostToHomePost = (post: WordPressPost, countryCode: string): HomePost => {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    country: countryCode,
    date: post.dateGmt || post.date,
    globalRelayId: post.id,
    category: post.categories?.[0]?.name || null,
    featuredImage: post.featuredImage?.node || null,
  }
}

const mapPostsToHomePosts = (posts: WordPressPost[], countryCode: string): HomePost[] =>
  posts.map((post) => mapWordPressPostToHomePost(post, countryCode))

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
    : await fetchAggregatedHome()
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
    ? await fetchAggregatedHome()
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

type HomeContentFetcher = (_baseUrl: string) => Promise<HomeContentServerProps>

// Use centralized cache tags
const cacheTags = {
  home: CACHE_TAGS.HOME_COUNTRY,
  edition: CACHE_TAGS.EDITION,
}

// createCachedFetcher imported from @/lib/utils/cache
// Wrapper to use centralized config for revalidate time
const createHomeContentCachedFetcher = <T>(
  keyParts: string[],
  fn: (baseUrl: string) => Promise<T>,
  tags: string[] = [],
) => createCachedFetcher(keyParts, fn, { revalidate: HOME_FEED_REVALIDATE, tags })

const cachedBuildHomeContentProps = createHomeContentCachedFetcher(
  ["home-content", "default"],
  buildHomeContentPropsUncached,
  [cacheTags.home("all")],
)

const getEditionCache = (edition: SupportedEdition) => {
  const editionTags = [cacheTags.home(edition.code), cacheTags.edition(edition.code)]

  return createHomeContentCachedFetcher(
    ["home-content", edition.code],
    async (_baseUrl: string) =>
      buildHomeContentPropsForEditionUncached(_baseUrl, edition),
    editionTags,
  )
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
  const fetcher = getEditionCache(edition)
  return fetcher(_baseUrl)
}

// Category configuration - derived from content config
const categoryConfigs = appConfig.content.categories.map(name => ({ name, typeOverride: null }))

const configuredCategorySlugs = Array.from(
  new Set(
    categoryConfigs
      .map((config) => (config.typeOverride ?? config.name).toLowerCase())
      .filter((slug) => slug.length > 0),
  ),
)

async function getFrontPageSlicesForCountry(countryCode: string, options: any): Promise<any> {
  // Implementation here
}

async function getLatestPostsForCountry(countryCode: string, limit: number, offset: any, options: any): Promise<any> {
  // Implementation here
}

async function getFpTaggedPostsForCountry(countryCode: string, limit: number, options: any): Promise<any> {
  // Implementation here
}

async function getCategoriesForCountry(countryCode: string): Promise<any> {
  // Implementation here
}

async function getPostsForCategories(countryCode: string, categorySlugs: string[], limit: number): Promise<any> {
  // Implementation here
}

async function loadPostsByMostRecent(countryCode: string, options: any): Promise<any> {
  // Implementation here
}

async function loadTagPosts(countryCode: string, tag: string, options: any): Promise<any> {
  // Implementation here
}

const isAfricanEdition = (edition: SupportedEdition) => edition.code === AFRICAN_EDITION.code
const isCountryEdition = (edition: SupportedEdition) => edition.code !== AFRICAN_EDITION.code

const loadUnstableCacheAdapter = (fn: any, cacheTags: string[]) => fn

// AFRICAN_EDITION is now derived from appConfig.home.editions.african at the top of the file

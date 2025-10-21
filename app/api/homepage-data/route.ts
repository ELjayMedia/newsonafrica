import { NextRequest, NextResponse } from "next/server"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import {
  DEFAULT_COUNTRY,
  getCategoriesForCountry,
  getFpTaggedPostsForCountry,
  getLatestPostsForCountry,
  getPostsForCategories,
  mapPostsToHomePosts,
} from "@/lib/wordpress-api"
import { KV_CACHE_KEYS } from "@/lib/cache/constants"
import { createCacheEntry, getEntryAge, kvCache } from "@/lib/cache/kv"
import type { HomePost } from "@/types/home"
import type { WordPressPost } from "@/types/wp"

const DEFAULT_TAGGED_LIMIT = 8
const DEFAULT_FEATURED_LIMIT = 6
const DEFAULT_RECENT_LIMIT = 10
const DEFAULT_CATEGORY_LIMIT = 5

export const runtime = "nodejs"
export const revalidate = 0

interface HomepageDataResult {
  taggedPosts: HomePost[]
  featuredPosts: HomePost[]
  categories: Awaited<ReturnType<typeof getCategoriesForCountry>>
  recentPosts: HomePost[]
  categoryPosts: Record<string, HomePost[]>
}

const parseLimit = (value: string | null, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// Homepage data entries live in Upstash KV for five minutes unless a revalidation request arrives.
const CACHE_TTL_SECONDS = 300
// After two minutes we serve stale data while refreshing in the background.
const STALE_AFTER_MS = 120_000
// Downstream clients (SWR, CDNs) can cache responses for two minutes and reuse stale data for another three.
const RESPONSE_S_MAXAGE_SECONDS = 120
const RESPONSE_STALE_REVALIDATE_SECONDS = 180
const FORCE_REVALIDATE_HEADER = "x-prerender-revalidate"

const parseCategorySlugs = (value: string | null): string[] => {
  if (!value) {
    return []
  }

  return value
    .split(",")
    .map((slug) => slug.trim().toLowerCase())
    .filter((slug) => slug.length > 0)
}

const dedupe = (values: string[]): string[] => Array.from(new Set(values))
const sortSlugs = (values: string[]): string[] => [...values].sort()

interface HomepageCacheKeyInput {
  country: string
  taggedLimit: number
  featuredLimit: number
  recentLimit: number
  categoryLimit: number
  categorySlugs: string[]
}

const buildHomepageCacheKey = ({
  country,
  taggedLimit,
  featuredLimit,
  recentLimit,
  categoryLimit,
  categorySlugs,
}: HomepageCacheKeyInput): string => {
  const slugKey = categorySlugs.length > 0 ? categorySlugs.join("|") : "__all__"

  return [
    KV_CACHE_KEYS.HOMEPAGE_DATA,
    country,
    taggedLimit,
    featuredLimit,
    recentLimit,
    categoryLimit,
    slugKey,
  ].join(":")
}

const buildHomepageCacheTags = (country: string, categorySlugs: string[]): string[] => {
  const tags = new Set<string>()

  const addTags = (next: string[]) => {
    next.forEach((tag) => tags.add(tag))
  }

  addTags(buildCacheTags({ country, section: "home", extra: ["tag:homepage-data"] }))
  addTags(buildCacheTags({ country, section: "frontpage", extra: ["tag:fp"] }))
  addTags(buildCacheTags({ country, section: "news" }))
  addTags(buildCacheTags({ country, section: "categories" }))

  categorySlugs.forEach((slug) => {
    addTags(buildCacheTags({ country, section: "categories", extra: [`category:${slug}`] }))
  })

  return Array.from(tags)
}

const mapCategoryPostsToHomePosts = (
  country: string,
  categoryResults: Record<string, { posts?: WordPressPost[] | null } | undefined>,
): Record<string, HomePost[]> => {
  return Object.entries(categoryResults).reduce<Record<string, HomePost[]>>((acc, [slug, result]) => {
    const posts = Array.isArray(result?.posts) ? result.posts : []
    acc[slug] = mapPostsToHomePosts(posts, country)
    return acc
  }, {})
}

interface HomepageQueryInput {
  country: string
  taggedLimit: number
  featuredLimit: number
  recentLimit: number
  categoryLimit: number
  categorySlugs: string[]
}

const fetchHomepageData = async ({
  country,
  taggedLimit,
  featuredLimit,
  recentLimit,
  categoryLimit,
  categorySlugs,
}: HomepageQueryInput): Promise<HomepageDataResult> => {
  const [taggedResult, latestResult, categoriesResult, categoryPostsResult] = await Promise.allSettled([
    getFpTaggedPostsForCountry(country, taggedLimit),
    getLatestPostsForCountry(country, recentLimit),
    getCategoriesForCountry(country),
    categorySlugs.length > 0 ? getPostsForCategories(country, categorySlugs, categoryLimit) : Promise.resolve({}),
  ])

  const taggedPosts = taggedResult.status === "fulfilled" ? taggedResult.value : []

  const latestPosts =
    latestResult.status === "fulfilled" && Array.isArray(latestResult.value?.posts)
      ? latestResult.value.posts
      : []
  const recentPosts = mapPostsToHomePosts(latestPosts, country)

  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : []

  const categoryPostsRaw =
    categoryPostsResult.status === "fulfilled" && categoryPostsResult.value
      ? categoryPostsResult.value
      : {}

  const categoryPosts = mapCategoryPostsToHomePosts(country, categoryPostsRaw)

  const featuredPosts = taggedPosts.length > 0
    ? taggedPosts.slice(0, featuredLimit)
    : recentPosts.slice(0, featuredLimit)

  return {
    taggedPosts,
    featuredPosts,
    categories,
    recentPosts,
    categoryPosts,
  }
}

const buildResponse = (
  payload: HomepageDataResult,
  country: string,
  requestedCategorySlugs: string[],
): NextResponse => {
  const effectiveCategorySlugs = dedupe([
    ...requestedCategorySlugs,
    ...Object.keys(payload.categoryPosts ?? {}),
  ])
  const cacheTags = buildHomepageCacheTags(country, effectiveCategorySlugs)
  const response = NextResponse.json(payload)

  if (cacheTags.length > 0) {
    response.headers.set("x-next-cache-tags", cacheTags.join(","))
  }

  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${RESPONSE_S_MAXAGE_SECONDS}, stale-while-revalidate=${RESPONSE_STALE_REVALIDATE_SECONDS}`,
  )
  response.headers.set("x-homepage-cache-ttl", String(CACHE_TTL_SECONDS))

  return response
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const country = (url.searchParams.get("country") || DEFAULT_COUNTRY).toLowerCase()
  const taggedLimit = parseLimit(url.searchParams.get("taggedLimit"), DEFAULT_TAGGED_LIMIT)
  const featuredLimit = parseLimit(url.searchParams.get("featuredLimit"), DEFAULT_FEATURED_LIMIT)
  const recentLimit = parseLimit(url.searchParams.get("recentLimit"), DEFAULT_RECENT_LIMIT)
  const categoryLimit = parseLimit(url.searchParams.get("categoryLimit"), DEFAULT_CATEGORY_LIMIT)
  const categorySlugs = dedupe(parseCategorySlugs(url.searchParams.get("categories")))
  const sortedCategorySlugs = sortSlugs(categorySlugs)
  const cacheKey = buildHomepageCacheKey({
    country,
    taggedLimit,
    featuredLimit,
    recentLimit,
    categoryLimit,
    categorySlugs: sortedCategorySlugs,
  })
  const shouldForceRefresh = request.headers.has(FORCE_REVALIDATE_HEADER)
  const queryInput: HomepageQueryInput = {
    country,
    taggedLimit,
    featuredLimit,
    recentLimit,
    categoryLimit,
    categorySlugs: sortedCategorySlugs,
  }

  try {
    if (!shouldForceRefresh) {
      const cached = await kvCache.get<HomepageDataResult>(cacheKey)
      const hasCachedValue = Boolean(cached?.value)
      const age = getEntryAge(cached)
      const isExpired = hasCachedValue && age >= CACHE_TTL_SECONDS * 1000
      const isFresh = hasCachedValue && age < STALE_AFTER_MS

      if (hasCachedValue && !isExpired && cached?.value) {
        if (!isFresh) {
          kvCache.runBackgroundRefresh(request, async () => {
            try {
              const fresh = await fetchHomepageData(queryInput)
              await kvCache.set(cacheKey, createCacheEntry(fresh), CACHE_TTL_SECONDS)
            } catch (error) {
              console.error("Background homepage cache refresh failed", { error })
            }
          })
        }

        return buildResponse(cached.value, country, sortedCategorySlugs)
      }
    }

    const payload = await fetchHomepageData(queryInput)

    try {
      await kvCache.set(cacheKey, createCacheEntry(payload), CACHE_TTL_SECONDS)
    } catch (error) {
      console.error("Failed to persist homepage cache", { error })
    }

    return buildResponse(payload, country, sortedCategorySlugs)
  } catch (error) {
    console.error("[v0] Failed to fetch homepage data:", error)
    return NextResponse.json(
      { error: "Failed to fetch homepage data" },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

import { buildCacheTags } from "@/lib/cache/tag-utils"
import {
  DEFAULT_COUNTRY,
  getCategoriesForCountry,
  getFpTaggedPostsForCountry,
  getLatestPostsForCountry,
  getPostsForCategories,
  mapPostsToHomePosts,
} from "@/lib/wordpress-api"
import type { HomePost } from "@/types/home"
import type { WordPressPost } from "@/lib/wordpress/client"

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const country = (url.searchParams.get("country") || DEFAULT_COUNTRY).toLowerCase()
  const taggedLimit = parseLimit(url.searchParams.get("taggedLimit"), DEFAULT_TAGGED_LIMIT)
  const featuredLimit = parseLimit(url.searchParams.get("featuredLimit"), DEFAULT_FEATURED_LIMIT)
  const recentLimit = parseLimit(url.searchParams.get("recentLimit"), DEFAULT_RECENT_LIMIT)
  const categoryLimit = parseLimit(url.searchParams.get("categoryLimit"), DEFAULT_CATEGORY_LIMIT)
  const categorySlugs = dedupe(parseCategorySlugs(url.searchParams.get("categories")))
  const initialCacheTags = buildHomepageCacheTags(country, categorySlugs)

  if (initialCacheTags.length > 0) {
    await Promise.all(initialCacheTags.map(async (tag) => revalidateTag(tag)))
  }

  try {
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

    const payload: HomepageDataResult = {
      taggedPosts,
      featuredPosts,
      categories,
      recentPosts,
      categoryPosts,
    }

    const response = NextResponse.json(payload)

    const cacheTags = buildHomepageCacheTags(
      country,
      dedupe([...categorySlugs, ...Object.keys(categoryPostsRaw)]),
    )

    const extraTagsToRevalidate = cacheTags.filter((tag) => !initialCacheTags.includes(tag))
    if (extraTagsToRevalidate.length > 0) {
      await Promise.all(extraTagsToRevalidate.map(async (tag) => revalidateTag(tag)))
    }
    if (cacheTags.length > 0) {
      response.headers.set("x-next-cache-tags", cacheTags.join(","))
    }
    response.headers.set("Cache-Control", "no-store")

    return response
  } catch (error) {
    console.error("[v0] Failed to fetch homepage data:", error)
    return NextResponse.json(
      { error: "Failed to fetch homepage data" },
      { status: 500 },
    )
  }
}

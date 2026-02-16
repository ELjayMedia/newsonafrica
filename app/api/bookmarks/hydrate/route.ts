import { type NextRequest, NextResponse } from "next/server"
import pLimit from "p-limit"

import { enhancedCache } from "@/lib/cache/enhanced-cache"
import { fetchPosts, resolveCountryCode } from "@/lib/wordpress-api"
import { logRequest } from "@/lib/api-utils"

export const runtime = "nodejs"

const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()

interface BookmarkHydrationRequestItem {
  country?: string | null
  postIds?: Array<string | number>
}

interface BookmarkHydrationPost {
  id: string
  country?: string
  slug?: string
  title?: string
  excerpt?: string
  featuredImage?: {
    url?: string
    width?: number
    height?: number
  } | null
}

type CacheValue = { posts: Record<string, BookmarkHydrationPost> }

export const HYDRATE_CONCURRENCY = 4

const extractText = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (typeof value === "object" && "rendered" in (value as Record<string, unknown>)) {
    const rendered = (value as { rendered?: unknown }).rendered
    return typeof rendered === "string" ? rendered : undefined
  }
  return undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null
}

const extractFeaturedImage = (value: unknown): BookmarkHydrationPost["featuredImage"] => {
  if (!value) return null
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return extractFeaturedImage(parsed)
    } catch {
      return null
    }
  }

  const obj = asRecord(value)
  if (!obj) return null

  const node = asRecord(obj.node)
  if (node) {
    return extractFeaturedImage(node)
  }

  const mediaDetails = asRecord(obj.mediaDetails)
  const mediaDetailsLegacy = asRecord(obj.media_details)
  const guid = asRecord(obj.guid)

  const url =
    (typeof obj.url === "string" && obj.url) ||
    (typeof obj.sourceUrl === "string" && obj.sourceUrl) ||
    (typeof obj.source_url === "string" && obj.source_url) ||
    (typeof mediaDetailsLegacy?.source_url === "string" && mediaDetailsLegacy.source_url) ||
    (typeof guid?.rendered === "string" && guid.rendered) ||
    undefined
  const widthValue = obj.width ?? mediaDetails?.width ?? mediaDetailsLegacy?.width
  const heightValue = obj.height ?? mediaDetails?.height ?? mediaDetailsLegacy?.height
  const width = typeof widthValue === "number" ? widthValue : undefined
  const height = typeof heightValue === "number" ? heightValue : undefined

  if (!url && !width && !height) {
    return null
  }

  return {
    url: url || undefined,
    width: typeof width === "number" ? width : undefined,
    height: typeof height === "number" ? height : undefined,
  }
}

const normaliseRequestItems = (
  items: BookmarkHydrationRequestItem[],
): Array<{
  country: string
  postIds: string[]
}> => {
  const grouped = new Map<string, Set<string>>()

  items.forEach((item) => {
    const ids = Array.isArray(item.postIds) ? item.postIds.map(String).filter(Boolean) : []
    if (ids.length === 0) return
    const country = (item.country || DEFAULT_COUNTRY).toLowerCase()
    if (!grouped.has(country)) {
      grouped.set(country, new Set())
    }
    const bucket = grouped.get(country)!
    ids.forEach((id) => bucket.add(id))
  })

  return Array.from(grouped.entries()).map(([country, idSet]) => ({
    country,
    postIds: Array.from(idSet),
  }))
}

export async function POST(req: NextRequest) {
  logRequest(req)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an array" }, { status: 400 })
  }

  const requests = normaliseRequestItems(body)

  if (requests.length === 0) {
    return NextResponse.json({ posts: {} })
  }

  const sortedKey = requests
    .map((reqItem) => ({
      country: reqItem.country,
      postIds: [...reqItem.postIds].sort(),
    }))
    .sort((a, b) => (a.country < b.country ? -1 : a.country > b.country ? 1 : 0))
  const cacheKey = `bookmarks:hydrate:${JSON.stringify(sortedKey)}`

  const cached = enhancedCache.get<CacheValue>(cacheKey)
  if (cached.exists && cached.data && !cached.isStale) {
    return NextResponse.json(cached.data)
  }

  if (
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.BOOKMARKS_HYDRATE_LOG_LIMITER === "true"
  ) {
    console.info("[bookmarks.hydrate] Applying concurrency limiter", {
      concurrency: HYDRATE_CONCURRENCY,
      requestCount: requests.length,
    })
  }

  const postsById = await hydrateBookmarkRequests(requests)

  const responsePayload: CacheValue = { posts: postsById }

  enhancedCache.set(cacheKey, responsePayload, 60000, 300000)

  return NextResponse.json(responsePayload)
}

export async function hydrateBookmarkRequests(
  requests: Array<{ country: string; postIds: string[] }>,
): Promise<Record<string, BookmarkHydrationPost>> {
  const postsById: Record<string, BookmarkHydrationPost> = {}
  const limit = pLimit(HYDRATE_CONCURRENCY)

  await Promise.all(
    requests.map(({ country, postIds }) =>
      limit(async () => {
        if (postIds.length === 0) return

        let countryCode: string | undefined

        if (country.length === 2) {
          countryCode = country.toLowerCase()
        } else {
          countryCode = resolveCountryCode(country) ?? undefined
        }

        try {
          const result = await fetchPosts({
            ids: postIds,
            perPage: Math.min(Math.max(postIds.length, 1), 100),
            countryCode,
          })
          const postsArray = Array.isArray(result) ? result : result?.data || []

          postsArray.forEach((post: unknown) => {
            const postRecord = asRecord(post)
            if (!postRecord?.id) return
            const id = String(postRecord.id)
            const embedded = asRecord(postRecord._embedded)
            const featuredMedia = Array.isArray(embedded?.["wp:featuredmedia"])
              ? embedded?.["wp:featuredmedia"]
              : []
            postsById[id] = {
              id,
              country,
              slug: typeof postRecord.slug === "string" ? postRecord.slug : undefined,
              title: extractText(postRecord.title),
              excerpt: extractText(postRecord.excerpt),
              featuredImage:
                extractFeaturedImage(postRecord.featuredImage ?? featuredMedia[0]) || null,
            }
          })
        } catch (error) {
          console.error("Failed to hydrate bookmarks", { country, postIds, error })
        }
      }),
    ),
  )

  return postsById
}

import { type NextRequest, NextResponse } from "next/server"
import { enhancedCache } from "@/lib/cache/enhanced-cache"
import { fetchPosts, resolveCountryTermId } from "@/lib/wordpress-api"
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
  featured_image?: {
    url?: string
    width?: number
    height?: number
  } | null
}

type CacheValue = { posts: Record<string, BookmarkHydrationPost> }

const extractText = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (typeof value === "object" && "rendered" in (value as Record<string, unknown>)) {
    const rendered = (value as { rendered?: unknown }).rendered
    return typeof rendered === "string" ? rendered : undefined
  }
  return undefined
}

const extractFeaturedImage = (value: any): BookmarkHydrationPost["featured_image"] => {
  if (!value) return null
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return extractFeaturedImage(parsed)
    } catch {
      return null
    }
  }
  if (value?.node) {
    return extractFeaturedImage(value.node)
  }

  const url =
    value?.url || value?.sourceUrl || value?.source_url || value?.media_details?.source_url || value?.guid?.rendered
  const width = value?.width || value?.mediaDetails?.width || value?.media_details?.width
  const height = value?.height || value?.mediaDetails?.height || value?.media_details?.height

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

  const postsById: Record<string, BookmarkHydrationPost> = {}

  await Promise.all(
    requests.map(async ({ country, postIds }) => {
      if (postIds.length === 0) return

      let countryCode: string | undefined
      let countryTermId: number | undefined

      if (country.length === 2) {
        countryCode = country
      } else {
        countryTermId = await resolveCountryTermId(country)
      }

      try {
        const result = await fetchPosts({
          ids: postIds,
          perPage: Math.min(Math.max(postIds.length, 1), 100),
          countryCode,
          countryTermId,
        })
        const postsArray = Array.isArray(result) ? result : result?.data || []

        postsArray.forEach((post: any) => {
          if (!post?.id) return
          const id = String(post.id)
          postsById[id] = {
            id,
            country,
            slug: typeof post.slug === "string" ? post.slug : undefined,
            title: extractText(post.title),
            excerpt: extractText(post.excerpt),
            featured_image:
              extractFeaturedImage(post.featuredImage || post._embedded?.["wp:featuredmedia"]?.[0]) || null,
          }
        })
      } catch (error) {
        console.error("Failed to hydrate bookmarks", { country, postIds, error })
      }
    }),
  )

  const responsePayload: CacheValue = { posts: postsById }

  enhancedCache.set(cacheKey, responsePayload, 60000, 300000)

  return NextResponse.json(responsePayload)
}

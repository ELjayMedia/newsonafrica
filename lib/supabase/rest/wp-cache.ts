import { buildRestUrl } from "./client"
import { DEFAULT_LIMIT, MAX_LIMIT } from "./constants"
import { parseResponse } from "./errors"
import { publicHeaders } from "./headers"
import type { WPPostCache } from "./types"

const WP_CACHE_SELECT =
  "edition_code,wp_post_id,slug,title,excerpt,featured_image_url,published_at,cached_at"

type CacheParams = {
  fetchOptions?: RequestInit
}

export async function getCachedPost(params: {
  edition_code: string
  wp_post_id: number
} & CacheParams): Promise<WPPostCache | null> {
  const searchParams = new URLSearchParams({
    select: WP_CACHE_SELECT,
    edition_code: `eq.${params.edition_code}`,
    wp_post_id: `eq.${params.wp_post_id}`,
    limit: "1",
  })

  const url = buildRestUrl("wp_posts_cache", searchParams)

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: publicHeaders(),
  })

  const data = await parseResponse<WPPostCache[]>(response)
  return data[0] ?? null
}

export async function findCachedPostBySlug(params: {
  edition_code?: string
  slug: string
} & CacheParams): Promise<WPPostCache | null> {
  const searchParams = new URLSearchParams({
    select: WP_CACHE_SELECT,
    slug: `eq.${params.slug}`,
    limit: "1",
  })

  if (params.edition_code) {
    searchParams.append("edition_code", `eq.${params.edition_code}`)
  }

  const url = buildRestUrl("wp_posts_cache", searchParams)

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: publicHeaders(),
  })

  const data = await parseResponse<WPPostCache[]>(response)
  return data[0] ?? null
}

export async function searchCachedPostsByTitle(params: {
  edition_code?: string
  q: string
  limit?: number
} & CacheParams): Promise<WPPostCache[]> {
  const searchParams = new URLSearchParams({
    select: "edition_code,wp_post_id,slug,title,excerpt,featured_image_url,published_at",
    title: `ilike.*${params.q}*`,
    order: "published_at.desc",
    limit: String(Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)),
  })

  if (params.edition_code) {
    searchParams.append("edition_code", `eq.${params.edition_code}`)
  }

  const url = buildRestUrl("wp_posts_cache", searchParams)

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: publicHeaders(),
  })

  return parseResponse<WPPostCache[]>(response)
}

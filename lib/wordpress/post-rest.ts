import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { fetchWithRetry } from "@/lib/utils/fetchWithRetry"
import { getWpEndpoints } from "@/lib/wp-endpoints"

export interface FetchWordPressPostBySlugRestOptions {
  tags?: readonly string[]
  revalidate?: number
}

export interface WordPressRestMediaDetails {
  width?: number
  height?: number
}

export interface WordPressRestCaption {
  rendered?: string
}

export interface WordPressRestMedia {
  id?: number
  source_url?: string
  alt_text?: string
  caption?: string | WordPressRestCaption
  media_details?: WordPressRestMediaDetails | null
}

export interface WordPressRestAuthor {
  id?: number
  name?: string
  slug?: string
  description?: string
  avatar_urls?: Record<string, string | undefined>
}

export interface WordPressRestTerm {
  id?: number
  taxonomy?: string
  name?: string
  slug?: string
  description?: string
  count?: number
}

export interface WordPressRestPost {
  id?: number
  slug?: string
  date?: string
  modified?: string
  link?: string
  title?: { rendered?: string } | null
  excerpt?: { rendered?: string } | null
  content?: { rendered?: string } | null
  _embedded?: {
    author?: Array<WordPressRestAuthor | null | undefined>
    "wp:featuredmedia"?: Array<WordPressRestMedia | null | undefined>
    "wp:term"?: Array<Array<WordPressRestTerm | null | undefined> | null | undefined>
  }
}

const dedupe = (values?: readonly string[]): string[] | undefined => {
  if (!values?.length) {
    return undefined
  }

  return Array.from(new Set(values))
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "")

export async function fetchWordPressPostBySlugRest(
  countryCode: string,
  slug: string,
  options: FetchWordPressPostBySlugRestOptions = {},
): Promise<WordPressRestPost | null> {
  const endpoints = getWpEndpoints(countryCode)
  const base = trimTrailingSlash(endpoints.rest)
  const url = `${base}/posts?slug=${encodeURIComponent(slug)}&_embed=1`

  try {
    const response = await fetchWithRetry(url, {
      next: {
        revalidate: options.revalidate ?? CACHE_DURATIONS.MEDIUM,
        ...(options.tags ? { tags: dedupe(options.tags) } : {}),
      },
    })

    if (!response.ok) {
      console.error("[v0] WordPress REST request failed:", response.status, response.statusText, {
        countryCode,
        slug,
      })
      return null
    }

    const json = (await response.json()) as unknown

    if (!Array.isArray(json) || json.length === 0) {
      return null
    }

    return (json[0] ?? null) as WordPressRestPost | null
  } catch (error) {
    console.error("[v0] WordPress REST request exception:", { countryCode, slug, error })
    return null
  }
}

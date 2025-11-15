import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { fetchWithRetry } from "@/lib/utils/fetchWithRetry"
import { rewriteLegacyLinks } from "@/lib/utils/routing"
import { getRestBase } from "@/lib/wp-endpoints"
import type {
  WordPressAuthor,
  WordPressCategoryConnection,
  WordPressMedia,
  WordPressPost,
  WordPressTagConnection,
} from "@/types/wp"

const DEFAULT_ATTEMPTS = 4
const DEFAULT_BACKOFF_MS = 750
const DEFAULT_BACKOFF_FACTOR = 2.5

export interface FetchWordPressRestPostOptions {
  tags?: readonly string[]
  revalidate?: number
  timeout?: number
  signal?: AbortSignal
  attempts?: number
  backoffMs?: number
  backoffFactor?: number
}

export interface WordPressRestPostSuccess {
  ok: true
  post: WordPressPost | null
}

export interface WordPressRestPostFailure {
  ok: false
  error: Error
  status?: number
  response?: Response
}

export type FetchWordPressRestPostResult =
  | WordPressRestPostSuccess
  | WordPressRestPostFailure

type EmbeddedMedia = {
  source_url?: string
  alt_text?: string
  caption?: { rendered?: string }
  media_details?: { width?: number; height?: number }
}

type EmbeddedAuthor = {
  id?: number
  name?: string
  slug?: string
  description?: string
  avatar_urls?: Record<string, string>
}

type EmbeddedTerm = {
  id?: number
  slug?: string
  name?: string
  description?: string
  taxonomy?: string
}

interface RestPost {
  id?: number
  slug?: string
  link?: string
  date?: string
  modified?: string
  title?: { rendered?: string }
  excerpt?: { rendered?: string }
  content?: { rendered?: string }
  _embedded?: {
    author?: EmbeddedAuthor[]
    "wp:featuredmedia"?: EmbeddedMedia[]
    "wp:term"?: EmbeddedTerm[][]
  }
}

const dedupe = (values?: readonly string[]): string[] | undefined => {
  if (!values?.length) {
    return undefined
  }

  return Array.from(new Set(values)).sort()
}

const resolveRenderedText = (value?: { rendered?: string }): string | undefined => {
  if (!value?.rendered) {
    return undefined
  }

  return value.rendered
}

const mapFeaturedMedia = (post: RestPost): WordPressMedia | undefined => {
  const media = post._embedded?.["wp:featuredmedia"]?.[0]
  if (!media) {
    return undefined
  }

  const caption = resolveRenderedText(media.caption ?? undefined)

  return {
    node: {
      sourceUrl: media.source_url ?? undefined,
      altText: media.alt_text ?? undefined,
      caption: caption ?? undefined,
      mediaDetails: media.media_details
        ? {
            width: media.media_details.width ?? undefined,
            height: media.media_details.height ?? undefined,
          }
        : undefined,
    },
  }
}

const mapAuthor = (post: RestPost): WordPressAuthor | undefined => {
  const author = post._embedded?.author?.[0]
  if (!author) {
    return undefined
  }

  const avatarUrl = author.avatar_urls?.["96"] ?? author.avatar_urls?.["48"]

  return {
    id: author.id,
    databaseId: author.id,
    name: author.name ?? "",
    slug: author.slug ?? "",
    description: author.description ?? undefined,
    avatar: avatarUrl ? { url: avatarUrl } : undefined,
    avatar_urls: author.avatar_urls ?? undefined,
    node: {
      id: author.id,
      databaseId: author.id,
      name: author.name ?? "",
      slug: author.slug ?? "",
      description: author.description ?? undefined,
      avatar: avatarUrl ? { url: avatarUrl } : undefined,
    },
  }
}

const mapTerms = (
  post: RestPost,
  taxonomy: "category" | "post_tag",
): WordPressCategoryConnection | WordPressTagConnection => {
  const termGroups = post._embedded?.["wp:term"] ?? []
  const terms = termGroups
    .flat()
    .filter((term): term is EmbeddedTerm => Boolean(term?.slug) && term?.taxonomy === taxonomy)

  const nodes = terms.map((term) => ({
    id: term.id,
    databaseId: term.id,
    name: term.name ?? undefined,
    slug: term.slug ?? undefined,
    description: term.description ?? undefined,
  }))

  if (taxonomy === "category") {
    return { nodes }
  }

  return { nodes }
}

const mapRestPostToWordPressPost = (
  post: RestPost,
  countryCode: string,
): WordPressPost => {
  const rawContent = resolveRenderedText(post.content)

  return {
    databaseId: post.id ?? undefined,
    id: post.id != null ? String(post.id) : undefined,
    slug: post.slug ?? undefined,
    date: post.date ?? undefined,
    modified: post.modified ?? undefined,
    title: resolveRenderedText(post.title) ?? "",
    excerpt: resolveRenderedText(post.excerpt) ?? "",
    content: rawContent ? rewriteLegacyLinks(rawContent, countryCode) : undefined,
    link: post.link ?? undefined,
    featuredImage: mapFeaturedMedia(post),
    author: mapAuthor(post),
    categories: mapTerms(post, "category") as WordPressCategoryConnection,
    tags: mapTerms(post, "post_tag") as WordPressTagConnection,
  }
}

const buildFetchOptions = (
  options: FetchWordPressRestPostOptions,
  revalidateDefault: number,
): Parameters<typeof fetchWithRetry>[1] => {
  const dedupedTags = dedupe(options.tags)
  const resolvedRevalidate =
    options.revalidate ?? (dedupedTags?.length ? revalidateDefault : CACHE_DURATIONS.MEDIUM)

  const fetchOptions: Parameters<typeof fetchWithRetry>[1] = {
    method: "GET",
    timeout: options.timeout,
    signal: options.signal,
    attempts: options.attempts ?? DEFAULT_ATTEMPTS,
    backoffMs: options.backoffMs ?? DEFAULT_BACKOFF_MS,
    backoffFactor: options.backoffFactor ?? DEFAULT_BACKOFF_FACTOR,
  }

  if (dedupedTags?.length || resolvedRevalidate > CACHE_DURATIONS.NONE) {
    fetchOptions.next = {
      ...(resolvedRevalidate > CACHE_DURATIONS.NONE
        ? { revalidate: resolvedRevalidate }
        : {}),
      ...(dedupedTags?.length ? { tags: dedupedTags } : {}),
    }
  } else {
    fetchOptions.cache = "no-store"
  }

  return fetchOptions
}

export async function fetchWordPressRestPost(
  countryCode: string,
  slug: string,
  options: FetchWordPressRestPostOptions = {},
): Promise<FetchWordPressRestPostResult> {
  const base = getRestBase(countryCode)
  const searchParams = new URLSearchParams({ slug, _embed: "true" })
  const url = `${base}/posts?${searchParams.toString()}`

  try {
    const response = await fetchWithRetry(url, buildFetchOptions(options, CACHE_DURATIONS.MEDIUM))

    if (!response.ok) {
      return {
        ok: false,
        error: new Error(`WordPress REST request failed with status ${response.status}`),
        status: response.status,
        response,
      }
    }

    const json = (await response.json()) as RestPost[]
    const restPost = Array.isArray(json) ? json[0] ?? null : null

    if (!restPost) {
      return { ok: true, post: null }
    }

    return {
      ok: true,
      post: mapRestPostToWordPressPost(restPost, countryCode),
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error("WordPress REST request failed"),
    }
  }
}

export type { WordPressPost }

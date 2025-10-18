import { buildCacheTags, type BuildCacheTagsParams } from "../cache/tag-utils"
import { WORDPRESS_REST_MAX_PER_PAGE } from "../wordpress-queries"
import { withGraphqlFallback, type WithGraphqlFallbackLogMeta } from "../wordpress/client"

export interface GraphqlFirstMessages {
  empty?: string
  error?: string
}

export interface GraphqlFirstOptions<TGraphqlResult, TResult> {
  fetchGraphql: () => Promise<TGraphqlResult | null | undefined>
  normalize: (data: TGraphqlResult | null | undefined) => TResult | null | undefined
  makeRestFallback: () => Promise<TResult>
  cacheTags?: string[]
  logMeta: WithGraphqlFallbackLogMeta
  messages?: GraphqlFirstMessages
  onGraphqlEmpty?: () => void
  onGraphqlError?: (error: unknown) => void
}

export function buildWpCacheTags(params: BuildCacheTagsParams): string[] {
  return buildCacheTags(params)
}

export async function graphqlFirst<TGraphqlResult, TResult>({
  fetchGraphql,
  normalize,
  makeRestFallback,
  cacheTags,
  logMeta,
  messages,
  onGraphqlEmpty,
  onGraphqlError,
}: GraphqlFirstOptions<TGraphqlResult, TResult>): Promise<TResult> {
  return withGraphqlFallback<TGraphqlResult, TResult>({
    fetchGraphql,
    normalize,
    makeRestFallback,
    cacheTags,
    logMeta,
    messages,
    onGraphqlEmpty,
    onGraphqlError,
  })
}

export interface RestPaginationResult<TItem> {
  items: TItem[]
  hasMore: boolean
  pagesFetched: number
}

export interface RestPaginationOptions<TItem> {
  limit: number
  pageSize?: number
  startPage?: number
  maxPerPage?: number
  throttleMs?: number
  makeRequest: (page: number, perPage: number) => Promise<{ items: TItem[]; headers?: Headers | null }>
}

export const DEFAULT_REST_PAGE_SIZE = WORDPRESS_REST_MAX_PER_PAGE
export const DEFAULT_REST_REQUEST_THROTTLE_MS = 150

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const parseTotalPages = (headers?: Headers | null): number | null => {
  if (!headers) {
    return null
  }

  const headerValue = headers.get("X-WP-TotalPages") ?? headers.get("x-wp-totalpages")
  if (!headerValue) {
    return null
  }

  const parsed = Number.parseInt(headerValue, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export async function paginateRest<TItem>({
  limit,
  pageSize,
  startPage = 1,
  maxPerPage = WORDPRESS_REST_MAX_PER_PAGE,
  throttleMs = DEFAULT_REST_REQUEST_THROTTLE_MS,
  makeRequest,
}: RestPaginationOptions<TItem>): Promise<RestPaginationResult<TItem>> {
  if (limit <= 0) {
    return { items: [], hasMore: false, pagesFetched: 0 }
  }

  const collected: TItem[] = []
  let currentPage = Math.max(startPage, 1)
  let pagesFetched = 0
  let hasMore = false
  let totalPagesFromHeaders: number | null = null

  while (collected.length < limit) {
    const remaining = limit - collected.length
    const desiredPageSize = pageSize ?? maxPerPage
    const perPage = Math.min(Math.max(desiredPageSize, 1), maxPerPage, remaining)

    const { items, headers } = await makeRequest(currentPage, perPage)
    const pageItems = Array.isArray(items) ? items : []
    pagesFetched += 1

    if (headers) {
      const parsedTotal = parseTotalPages(headers)
      if (parsedTotal !== null) {
        totalPagesFromHeaders = parsedTotal
      }
    }

    if (pageItems.length === 0) {
      hasMore = false
      break
    }

    collected.push(...pageItems)

    const reachedLimit = collected.length >= limit
    const possibleMore =
      totalPagesFromHeaders !== null
        ? currentPage < totalPagesFromHeaders
        : pageItems.length === perPage

    if (reachedLimit) {
      hasMore = possibleMore
      break
    }

    if (!possibleMore) {
      hasMore = false
      break
    }

    currentPage += 1

    if (throttleMs > 0) {
      await sleep(throttleMs)
    }
  }

  return {
    items: collected.slice(0, limit),
    hasMore,
    pagesFetched,
  }
}

import { unstable_cache } from "next/cache"

import { buildCacheTags, type BuildCacheTagsParams } from "../cache/tag-utils"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface CacheAwareFunctionOptions {
  keyParts: readonly string[]
  tags?: readonly string[]
  revalidate?: number
}

export const defaults = {
  retries: 3,
  retryBaseDelay: 200,
  retryMaxDelay: 2000,
}

const dedupe = (values?: readonly string[]): string[] | undefined => {
  if (!values?.length) {
    return undefined
  }

  return Array.from(new Set(values))
}

export function createCacheAwareFunction<TArgs extends unknown[], TResult>(
  source: (...args: TArgs) => Promise<TResult>,
  { keyParts, tags, revalidate }: CacheAwareFunctionOptions,
): (...args: TArgs) => Promise<TResult> {
  if (!keyParts.length) {
    throw new Error("createCacheAwareFunction requires at least one cache key part")
  }

  const cached = unstable_cache(source, Array.from(keyParts), {
    revalidate,
    tags: dedupe(tags),
  })

  return (...args: TArgs) => cached(...args)
}

export interface WithRetryOptions {
  retries?: number
  retryBaseDelay?: number
  retryMaxDelay?: number
  onRetry?: (attempt: number, error: unknown) => void
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

export async function withRetry<TResult>(
  operation: () => Promise<TResult>,
  {
    retries = defaults.retries,
    retryBaseDelay = defaults.retryBaseDelay,
    retryMaxDelay = defaults.retryMaxDelay,
    onRetry,
    shouldRetry,
  }: WithRetryOptions = {},
): Promise<TResult> {
  const maxRetries = Math.max(0, retries)

  for (let attempt = 0; ; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error
      }

      const retryAttempt = attempt + 1

      if (shouldRetry && !shouldRetry(error, retryAttempt)) {
        throw error
      }

      onRetry?.(retryAttempt, error)

      const backoff = Math.min(retryBaseDelay * Math.pow(2, attempt), retryMaxDelay)
      if (backoff > 0) {
        await wait(backoff)
      } else {
        await Promise.resolve()
      }
    }
  }
}

interface ThrottledQueueTask<TValue> {
  start: () => Promise<TValue>
  resolve: (value: TValue | PromiseLike<TValue>) => void
  reject: (reason: unknown) => void
}

export interface ThrottledQueueOptions {
  concurrency: number
  intervalMs?: number
}

export function createThrottledQueue({
  concurrency,
  intervalMs = 0,
}: ThrottledQueueOptions) {
  const maxConcurrency = Math.max(1, Math.floor(concurrency))
  const throttleInterval = Math.max(0, intervalMs)
  const queue: ThrottledQueueTask<unknown>[] = []

  let active = 0
  let lastStart = 0
  let pendingTimer: ReturnType<typeof setTimeout> | null = null

  const tryStartNext = () => {
    if (active >= maxConcurrency) {
      return
    }

    if (queue.length === 0) {
      return
    }

    const now = Date.now()
    const sinceLastStart = now - lastStart

    if (throttleInterval > 0 && sinceLastStart < throttleInterval) {
      if (pendingTimer === null) {
        pendingTimer = setTimeout(() => {
          pendingTimer = null
          tryStartNext()
        }, throttleInterval - sinceLastStart)
      }
      return
    }

    const task = queue.shift()!
    active += 1
    lastStart = Date.now()

    Promise.resolve()
      .then(task.start)
      .then((value) => task.resolve(value))
      .catch((error) => task.reject(error))
      .finally(() => {
        active -= 1
        tryStartNext()
      })

    if (active < maxConcurrency) {
      tryStartNext()
    }
  }

  return function enqueue<TValue>(start: () => Promise<TValue> | TValue): Promise<TValue> {
    return new Promise<TValue>((resolve, reject) => {
      queue.push({
        start: async () => await Promise.resolve(start()),
        resolve: (value) => resolve(value as TValue),
        reject,
      })

      if (pendingTimer === null) {
        tryStartNext()
      }
    })
  }
}

export function buildWpCacheTags(params: BuildCacheTagsParams): string[] {
  return buildCacheTags(params)
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

export const WORDPRESS_REST_MAX_PER_PAGE = 100

export const DEFAULT_REST_PAGE_SIZE = WORDPRESS_REST_MAX_PER_PAGE
export const DEFAULT_REST_REQUEST_THROTTLE_MS = 150

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
      await wait(throttleMs)
    }
  }

  return {
    items: collected.slice(0, limit),
    hasMore,
    pagesFetched,
  }
}

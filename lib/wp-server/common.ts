import { unstable_cache as nextCache } from "next/cache"
import pLimit from "p-limit"
import type { NextFetchRequestConfig } from "next/server"

import { CACHE_DURATIONS } from "@/lib/cache/constants"

const DEFAULT_FETCH_TIMEOUT = 10_000
const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY = 1_000
const DEFAULT_RETRY_MAX_DELAY = 8_000

export interface CacheAwareOptions {
  keyParts: readonly string[]
  revalidate?: number
  tags?: string[]
}

export function createCacheAwareFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  { keyParts, revalidate = CACHE_DURATIONS.MEDIUM, tags = [] }: CacheAwareOptions,
): (...args: Parameters<T>) => ReturnType<T> {
  if (keyParts.length === 0) {
    throw new Error("cache-aware functions require at least one cache key part")
  }

  const uniqueTags = Array.from(new Set(tags))

  return nextCache(fn, [...keyParts], {
    revalidate,
    tags: uniqueTags.length > 0 ? uniqueTags : undefined,
  })
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
  next?: NextFetchRequestConfig
  signal?: AbortSignal
}

export async function fetchWithTimeout(
  resource: RequestInfo | URL,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeout = DEFAULT_FETCH_TIMEOUT, signal, next, ...rest } = options
  const controller = new AbortController()

  const abortOnSignal = () => controller.abort(signal?.reason)
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener("abort", abortOnSignal)
    }
  }

  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(resource, { ...rest, next, signal: controller.signal })
  } finally {
    clearTimeout(timer)
    if (signal) {
      signal.removeEventListener("abort", abortOnSignal)
    }
  }
}

export interface RetryOptions {
  retries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
  onRetry?: (attempt: number, error: unknown) => void
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  {
    retries = DEFAULT_RETRY_ATTEMPTS,
    baseDelayMs = DEFAULT_RETRY_BASE_DELAY,
    maxDelayMs = DEFAULT_RETRY_MAX_DELAY,
    shouldRetry,
    onRetry,
  }: RetryOptions = {},
): Promise<T> {
  let attempt = 0
  let lastError: unknown

  while (attempt <= retries) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === retries || (shouldRetry && !shouldRetry(error))) {
        throw error
      }

      onRetry?.(attempt + 1, error)

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    attempt += 1
  }

  throw lastError ?? new Error("Retry operation failed")
}

export interface ThrottledQueueOptions {
  concurrency: number
  intervalMs?: number
}

type QueueTask<T> = () => Promise<T> | T

export function createThrottledQueue({
  concurrency,
  intervalMs = 0,
}: ThrottledQueueOptions) {
  if (!Number.isFinite(concurrency) || concurrency <= 0) {
    throw new Error("Throttled queue requires a concurrency greater than zero")
  }

  const limit = pLimit(concurrency)
  let lastRun = 0

  return async function enqueue<T>(task: QueueTask<T>): Promise<T> {
    return limit(async () => {
      if (intervalMs > 0) {
        const now = Date.now()
        const waitTime = Math.max(0, lastRun + intervalMs - now)

        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }

        lastRun = Date.now()
      }

      return await task()
    })
  }
}

export const defaults = {
  fetchTimeout: DEFAULT_FETCH_TIMEOUT,
  retryAttempts: DEFAULT_RETRY_ATTEMPTS,
  retryBaseDelay: DEFAULT_RETRY_BASE_DELAY,
  retryMaxDelay: DEFAULT_RETRY_MAX_DELAY,
}

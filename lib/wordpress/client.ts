import { cache } from "react"
import { createHash } from "node:crypto"

import { WP_AUTH_HEADERS } from "@/config/env"
import { getGraphQLEndpoint } from "@/lib/wp-endpoints"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { fetchWithRetry } from "../utils/fetchWithRetry"
import { SUPPORTED_COUNTRIES as SUPPORTED_COUNTRY_EDITIONS } from "../editions"

export interface CountryConfig {
  code: string
  name: string
  flag: string
  apiEndpoint: string
  canonicalUrl: string
  hreflang: string
  type?: "country"
}

export const COUNTRIES: Record<string, CountryConfig> = SUPPORTED_COUNTRY_EDITIONS.reduce(
  (acc, edition) => {
    acc[edition.code] = {
      code: edition.code,
      name: edition.name,
      flag: edition.flag,
      apiEndpoint: getGraphQLEndpoint(edition.code),
      canonicalUrl: edition.canonicalUrl,
      hreflang: edition.hreflang,
      type: "country",
    }
    return acc
  },
  {} as Record<string, CountryConfig>,
)

export interface FetchWordPressGraphQLOptions {
  tags?: readonly string[]
  revalidate?: number
  timeout?: number
  signal?: AbortSignal
}

const dedupe = (values?: readonly string[]): string[] | undefined => {
  if (!values?.length) {
    return undefined
  }

  return Array.from(new Set(values)).sort()
}

const FALLBACK_MEMO_SYMBOL = Symbol.for("newsonafrica.wpGraphqlMemo")

type MemoizedRequestEntry = {
  promise: Promise<unknown>
  metadataKey: string
  expiresAt: number
}

const getRequestScopedMemo = cache(
  () => new Map<string, MemoizedRequestEntry>(),
)

type GlobalWithMemo = typeof globalThis & {
  [FALLBACK_MEMO_SYMBOL]?: Map<string, MemoizedRequestEntry>
}

const getMemoizedRequests = (): Map<string, MemoizedRequestEntry> => {
  const requestScoped = getRequestScopedMemo()
  const validationCall = getRequestScopedMemo()

  if (requestScoped === validationCall) {
    return requestScoped
  }

  const globalObject = globalThis as GlobalWithMemo
  const globalStore = globalObject[FALLBACK_MEMO_SYMBOL]

  if (globalStore) {
    return globalStore
  }

  const fallbackStore = new Map<string, MemoizedRequestEntry>()
  globalObject[FALLBACK_MEMO_SYMBOL] = fallbackStore
  return fallbackStore
}

export class WordPressGraphQLHTTPError extends Error {
  public readonly status: number
  public readonly statusText: string
  public readonly response: Response

  constructor(response: Response) {
    const { status, statusText } = response
    super(`WordPress GraphQL request failed with status ${status}`)
    this.name = "WordPressGraphQLHTTPError"
    this.status = status
    this.statusText = statusText
    this.response = response
  }
}

export class WordPressGraphQLResponseError extends Error {
  public readonly errors: Array<{ message: string; [key: string]: unknown }>

  constructor(errors: Array<{ message: string; [key: string]: unknown }>) {
    super("WordPress GraphQL response contained errors")
    this.name = "WordPressGraphQLResponseError"
    this.errors = errors
  }
}

export type WordPressGraphQLSuccess<T> =
  { ok: true; data: T | null } & (T extends object ? T : Record<string, never>)

export type WordPressGraphQLFailureKind = "http_error" | "graphql_error"

export interface WordPressGraphQLFailureBase {
  ok: false
  kind: WordPressGraphQLFailureKind
  message: string
  error: Error
}

export interface WordPressGraphQLHTTPFailure extends WordPressGraphQLFailureBase {
  kind: "http_error"
  status: number
  statusText: string
  response: Response
  error: WordPressGraphQLHTTPError
}

export interface WordPressGraphQLResponseFailure
  extends WordPressGraphQLFailureBase {
  kind: "graphql_error"
  errors: Array<{ message: string; [key: string]: unknown }>
  error: WordPressGraphQLResponseError
}

export type WordPressGraphQLFailure =
  | WordPressGraphQLHTTPFailure
  | WordPressGraphQLResponseFailure

export type WordPressGraphQLResult<T> =
  | WordPressGraphQLSuccess<T>
  | WordPressGraphQLFailure

const buildSuccessResult = <T>(data: T | null): WordPressGraphQLSuccess<T> => {
  const base: { ok: true; data: T | null } = { ok: true, data }

  if (data && typeof data === "object") {
    return Object.assign({}, data, base) as WordPressGraphQLSuccess<T>
  }

  return base as WordPressGraphQLSuccess<T>
}

const buildHTTPFailureResult = (
  response: Response,
): WordPressGraphQLHTTPFailure => {
  const error = new WordPressGraphQLHTTPError(response)

  return {
    ok: false,
    kind: "http_error",
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    response,
    error,
  }
}

const buildGraphQLFailureResult = (
  errors: Array<{ message: string; [key: string]: unknown }>,
): WordPressGraphQLResponseFailure => {
  const error = new WordPressGraphQLResponseError(errors)

  return {
    ok: false,
    kind: "graphql_error",
    message: error.message,
    errors,
    error,
  }
}

export function fetchWordPressGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[] | boolean>,
  options: FetchWordPressGraphQLOptions = {},
): Promise<WordPressGraphQLResult<T>> {
  const base = getGraphQLEndpoint(countryCode)
  const body = JSON.stringify({ query, variables })
  const dedupedTags = dedupe(options.tags)
  const resolvedRevalidate = options.revalidate ?? CACHE_DURATIONS.MEDIUM
  const shouldMemoize = resolvedRevalidate > CACHE_DURATIONS.NONE
  const tagsKey = dedupedTags?.join(",") ?? ""
  const bodyHash = createHash("sha1").update(body).digest("hex")
  const cacheKey = `${base}::${bodyHash}::${tagsKey}`
  const metadataKey = String(resolvedRevalidate)
  const memoizedRequests = shouldMemoize ? getMemoizedRequests() : undefined
  let memoizedEntry: MemoizedRequestEntry | undefined

  const removeMemoizedEntry = () => {
    if (!shouldMemoize || !memoizedRequests) {
      return
    }

    const currentEntry = memoizedRequests.get(cacheKey)

    if (!currentEntry) {
      return
    }

    if (!memoizedEntry || currentEntry === memoizedEntry) {
      memoizedRequests.delete(cacheKey)
    }
  }

  if (shouldMemoize && memoizedRequests) {
    const cachedEntry = memoizedRequests.get(cacheKey) as
      | MemoizedRequestEntry
      | undefined
    if (cachedEntry) {
      const isExpired =
        cachedEntry.expiresAt !== Infinity && cachedEntry.expiresAt <= Date.now()
      if (isExpired) {
        memoizedRequests.delete(cacheKey)
      } else if (cachedEntry.metadataKey === metadataKey) {
        return cachedEntry.promise as Promise<WordPressGraphQLResult<T>>
      }
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }

  if (typeof window === "undefined" && WP_AUTH_HEADERS) {
    for (const [key, value] of Object.entries(WP_AUTH_HEADERS)) {
      headers[key] = value
    }
  }

  const fetchOptions: Parameters<typeof fetchWithRetry>[1] = {
    method: "POST",
    headers,
    body,
    timeout: options.timeout,
    signal: options.signal,
  }

  const nextCacheConfig =
    resolvedRevalidate > CACHE_DURATIONS.NONE || (dedupedTags?.length ?? 0) > 0
      ? {
          ...(resolvedRevalidate > CACHE_DURATIONS.NONE
            ? { revalidate: resolvedRevalidate }
            : {}),
          ...(dedupedTags && dedupedTags.length > 0 ? { tags: dedupedTags } : {}),
        }
      : undefined

  if (nextCacheConfig) {
    fetchOptions.next = nextCacheConfig
  } else {
    fetchOptions.cache = "no-store"
  }

  const requestPromise: Promise<WordPressGraphQLResult<T>> = fetchWithRetry(
    base,
    fetchOptions,
  )
    .then(async (res) => {
      if (!res.ok) {
        console.error("[v0] GraphQL request failed:", res.status, res.statusText)
        removeMemoizedEntry()
        return buildHTTPFailureResult(res)
      }

      const json = (await res.json()) as {
        data?: T
        errors?: Array<{ message: string; [key: string]: unknown }>
      }

      if (json.errors && json.errors.length > 0) {
        console.error("[v0] GraphQL errors:", json.errors)
        removeMemoizedEntry()
        return buildGraphQLFailureResult(json.errors)
      }

      return buildSuccessResult<T>(json.data ?? null)
    })
    .catch((error) => {
      console.error("[v0] GraphQL request exception:", error)
      removeMemoizedEntry()
      throw error
    })

  if (shouldMemoize && memoizedRequests) {
    const expiresAt =
      resolvedRevalidate > 0
        ? Date.now() + resolvedRevalidate * 1000
        : Number.POSITIVE_INFINITY

    const entry: MemoizedRequestEntry = {
      promise: requestPromise,
      metadataKey,
      expiresAt,
    }
    memoizedEntry = entry
    memoizedRequests.set(cacheKey, entry)

    if (resolvedRevalidate > 0) {
      const timeout = setTimeout(() => {
        const currentEntry = memoizedRequests.get(cacheKey)
        if (currentEntry === entry) {
          memoizedRequests.delete(cacheKey)
        }
      }, resolvedRevalidate * 1000)

      if (typeof timeout.unref === "function") {
        timeout.unref()
      }
    }
  }

  return requestPromise
}

export const __getMemoizedRequestsForTests = () => getMemoizedRequests()

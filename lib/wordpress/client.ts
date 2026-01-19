import { cache } from "react"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { getGraphQLEndpoint } from "@/lib/wp-endpoints"
import { fetchWithRetry } from "@/lib/utils/fetchWithRetry"

export interface FetchWordPressGraphQLOptions {
  tags?: readonly string[]
  revalidate?: number
  timeout?: number
  signal?: AbortSignal
  authHeaders?: Record<string, string>
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

const getRequestScopedMemo = cache(() => new Map<string, MemoizedRequestEntry>())

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

export type WordPressGraphQLSuccess<T> = { ok: true; data: T | null } & (T extends object ? T : Record<string, never>)

export type WordPressGraphQLFailureKind = "http_error" | "graphql_error" | "invalid_payload"

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

export interface WordPressGraphQLResponseFailure extends WordPressGraphQLFailureBase {
  kind: "graphql_error"
  errors: Array<{ message: string; [key: string]: unknown }>
  error: WordPressGraphQLResponseError
}

export class WordPressGraphQLInvalidPayloadError extends Error {
  public readonly response: Response
  public readonly bodySnippet: string
  public readonly cause: unknown

  constructor(response: Response, bodySnippet: string, cause?: unknown) {
    super("WordPress GraphQL response was not valid JSON")
    this.name = "WordPressGraphQLInvalidPayloadError"
    this.response = response
    this.bodySnippet = bodySnippet
    this.cause = cause
  }
}

export interface WordPressGraphQLInvalidPayloadFailure extends WordPressGraphQLFailureBase {
  kind: "invalid_payload"
  status: number
  statusText: string
  bodySnippet: string
  response: Response
  error: WordPressGraphQLInvalidPayloadError
}

export type WordPressGraphQLFailure =
  | WordPressGraphQLHTTPFailure
  | WordPressGraphQLResponseFailure
  | WordPressGraphQLInvalidPayloadFailure

export type WordPressGraphQLResult<T> = WordPressGraphQLSuccess<T> | WordPressGraphQLFailure

function buildSuccessResult<T>(data: T | null): WordPressGraphQLSuccess<T> {
  const base: { ok: true; data: T | null } = { ok: true, data }

  if (data && typeof data === "object") {
    return Object.assign({}, data, base) as WordPressGraphQLSuccess<T>
  }

  return base as WordPressGraphQLSuccess<T>
}

const buildHTTPFailureResult = (response: Response): WordPressGraphQLHTTPFailure => {
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

const truncateBodySnippet = (body: string, maxLength = 512): string => {
  if (body.length <= maxLength) {
    return body
  }

  return `${body.slice(0, maxLength)}…`
}

const buildInvalidPayloadFailureResult = (
  response: Response,
  body: string,
  cause?: unknown,
): WordPressGraphQLInvalidPayloadFailure => {
  const snippet = truncateBodySnippet(body)
  const error = new WordPressGraphQLInvalidPayloadError(response, snippet, cause)

  return {
    ok: false,
    kind: "invalid_payload",
    message: error.message,
    status: response.status,
    statusText: response.statusText,
    bodySnippet: snippet,
    response,
    error,
  }
}

const WP_REST_FALLBACK_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_WP_REST_FALLBACK === "1"

export function fetchWordPressGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[] | boolean>,
  options: FetchWordPressGraphQLOptions = {},
): Promise<WordPressGraphQLResult<T>> {
  const base = getGraphQLEndpoint(countryCode)

  if (!base || base === "") {
    console.error("[v0] GraphQL endpoint not configured for country:", countryCode)
    const error = new Error(`GraphQL endpoint not configured for country: ${countryCode}`)
    return Promise.resolve({
      ok: false,
      kind: "http_error" as const,
      message: error.message,
      status: 500,
      statusText: "Configuration Error",
      response: new Response(null, { status: 500, statusText: "Configuration Error" }),
      error: new WordPressGraphQLHTTPError(new Response(null, { status: 500 })),
    })
  }

  const body = JSON.stringify({ query, variables })
  const dedupedTags = dedupe(options.tags)
  const hasTags = (dedupedTags?.length ?? 0) > 0
  const resolvedRevalidate = options.revalidate ?? CACHE_DURATIONS.MEDIUM
  const memoizationTtlSeconds =
    resolvedRevalidate > CACHE_DURATIONS.NONE
      ? resolvedRevalidate
      : hasTags
        ? CACHE_DURATIONS.SHORT
        : CACHE_DURATIONS.NONE
  const shouldMemoize = memoizationTtlSeconds > CACHE_DURATIONS.NONE
  const tagsKey = dedupedTags?.join(",") ?? ""
  const cacheKey = `${base}::${body}::${tagsKey}`
  const metadataKey = shouldMemoize ? `ttl:${memoizationTtlSeconds}` : "ttl:0"
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
    const cachedEntry = memoizedRequests.get(cacheKey) as MemoizedRequestEntry | undefined
    if (cachedEntry) {
      const isExpired = cachedEntry.expiresAt !== Number.POSITIVE_INFINITY && cachedEntry.expiresAt <= Date.now()
      if (isExpired) {
        memoizedRequests.delete(cacheKey)
      } else if (cachedEntry.metadataKey === metadataKey) {
        return cachedEntry.promise as Promise<WordPressGraphQLResult<T>>
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (typeof window === "undefined" && options.authHeaders) {
    for (const [key, value] of Object.entries(options.authHeaders)) {
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
          ...(resolvedRevalidate > CACHE_DURATIONS.NONE ? { revalidate: resolvedRevalidate } : {}),
          ...(dedupedTags && dedupedTags.length > 0 ? { tags: dedupedTags } : {}),
        }
      : undefined

  if (nextCacheConfig) {
    fetchOptions.next = nextCacheConfig
  } else {
    fetchOptions.cache = "no-store"
  }

  const requestPromise: Promise<WordPressGraphQLResult<T>> = fetchWithRetry(base, fetchOptions)
    .then(async (res) => {
      if (!res.ok) {
        console.error("[v0] GraphQL request failed:", {
          country: countryCode,
          endpoint: base,
          status: res.status,
          statusText: res.statusText,
        })
        removeMemoizedEntry()
        return buildHTTPFailureResult(res)
      }

      let rawBody: string
      try {
        rawBody = await res.text()
      } catch (bodyError) {
        console.error("[v0] GraphQL response body read failed:", bodyError)
        removeMemoizedEntry()
        throw bodyError
      }

      let parsedPayload: unknown
      try {
        parsedPayload = rawBody ? JSON.parse(rawBody) : {}
      } catch (parseError) {
        console.error("[v0] GraphQL response JSON parse failed")
        removeMemoizedEntry()
        return buildInvalidPayloadFailureResult(res, rawBody, parseError)
      }

      if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
        console.error("[v0] GraphQL response payload was not an object")
        removeMemoizedEntry()
        return buildInvalidPayloadFailureResult(res, rawBody)
      }

      const json = parsedPayload as {
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
      console.error("[v0] GraphQL request exception:", {
        country: countryCode,
        endpoint: base,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      removeMemoizedEntry()
      throw error
    })

  if (shouldMemoize && memoizedRequests) {
    const expiresAt = memoizationTtlSeconds > 0 ? Date.now() + memoizationTtlSeconds * 1000 : Number.POSITIVE_INFINITY

    const entry: MemoizedRequestEntry = {
      promise: requestPromise,
      metadataKey,
      expiresAt,
    }
    memoizedEntry = entry
    memoizedRequests.set(cacheKey, entry)

    if (memoizationTtlSeconds > 0) {
      const timeout = setTimeout(() => {
        const currentEntry = memoizedRequests.get(cacheKey)
        if (currentEntry === entry) {
          memoizedRequests.delete(cacheKey)
        }
      }, memoizationTtlSeconds * 1000)

      if (typeof timeout.unref === "function") {
        timeout.unref()
      }
    }
  }

  return requestPromise
}

export async function fetchWordPressGraphQLWithFallback<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[] | boolean>,
  options: FetchWordPressGraphQLOptions = {},
): Promise<WordPressGraphQLResult<T>> {
  const result = await fetchWordPressGraphQL<T>(countryCode, query, variables, options)

  if (result.ok) {
    return result
  }

  // If GraphQL fails, attempt to serve from KV cache (stale-while-revalidate)
  if (result.kind === "http_error" && result.status >= 500) {
    console.warn("[v0] GraphQL server error, attempting stale cache fallback", {
      country: countryCode,
      status: result.status,
    })

    // Note: KV cache access would go here if configured
    // For now, we fail gracefully to let the UI show "retry later" message
  }

  return result
}

export const __getMemoizedRequestsForTests = () => getMemoizedRequests()

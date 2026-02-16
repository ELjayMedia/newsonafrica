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
  transport?: "post" | "get"
  persistedQueryId?: string
}

const MAX_GET_URL_LENGTH = 2000

const isEligibleReadQuery = (query: string): boolean => {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return false
  }

  return normalizedQuery.startsWith("{") || /^query\b/i.test(normalizedQuery)
}

const encodeVariablesForUrl = (
  variables?: Record<string, string | number | string[] | boolean>,
): string | undefined => {
  if (!variables || Object.keys(variables).length === 0) {
    return undefined
  }

  return JSON.stringify(variables)
}

const buildGraphQLGetUrl = (
  base: string,
  query: string,
  variables?: Record<string, string | number | string[] | boolean>,
  persistedQueryId?: string,
): string => {
  const params = new URLSearchParams()
  const encodedVariables = encodeVariablesForUrl(variables)

  if (persistedQueryId) {
    params.set("persistedQueryId", persistedQueryId)
  } else {
    params.set("query", query)
  }

  if (encodedVariables) {
    params.set("variables", encodedVariables)
  }

  const separator = base.includes("?") ? "&" : "?"
  return `${base}${separator}${params.toString()}`
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

const formatGraphQLErrors = (errors: Array<{ message: string;[key: string]: unknown }>) =>
  errors.map((e) => ({
    message: e.message,
    path: (e as any).path,
    code: (e as any)?.extensions?.code,
    category: (e as any)?.extensions?.category,
    locations: (e as any).locations,
  }))

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
  public readonly errors: Array<{ message: string;[key: string]: unknown }>

  constructor(errors: Array<{ message: string;[key: string]: unknown }>) {
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
  errors: Array<{ message: string;[key: string]: unknown }>
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
  errors: Array<{ message: string;[key: string]: unknown }>,
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

  if (process.env.NODE_ENV !== "production") {
    console.log("[v0] WPGraphQL endpoint resolved:", { country: countryCode, endpoint: base })
  }

  const requestPayload = options.persistedQueryId
    ? { persistedQueryId: options.persistedQueryId, variables }
    : { query, variables }
  const body = JSON.stringify(requestPayload)
  const requestedTransport = options.transport ?? "post"
  const canUseGetTransport =
    requestedTransport === "get" &&
    (options.persistedQueryId ? true : isEligibleReadQuery(query))
  const getUrl = canUseGetTransport
    ? buildGraphQLGetUrl(base, query, variables, options.persistedQueryId)
    : undefined
  const usesGetTransport = Boolean(getUrl) && getUrl.length <= MAX_GET_URL_LENGTH
  const requestUrl = usesGetTransport ? getUrl : base
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
  const cacheKey = `${requestedTransport}:${requestUrl}::${body}::${tagsKey}`
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

  if (options.authHeaders) {
    for (const [key, value] of Object.entries(options.authHeaders)) {
      headers[key] = value
    }
  }

  const fetchOptions: Parameters<typeof fetchWithRetry>[1] = {
    method: usesGetTransport ? "GET" : "POST",
    headers,
    timeout: options.timeout,
    signal: options.signal,
  }

  if (!usesGetTransport) {
    fetchOptions.body = body
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

  const requestPromise: Promise<WordPressGraphQLResult<T>> = fetchWithRetry(requestUrl, fetchOptions)
    .then(async (res) => {
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "")
        console.error("[v0] GraphQL request failed:", {
          country: countryCode,
          endpoint: base,
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get("content-type"),
          bodySnippet: truncateBodySnippet(bodyText),
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
        const looksLikeHTML = /^\s*</.test(rawBody)
        console.error("[v0] GraphQL response JSON parse failed", {
          country: countryCode,
          endpoint: base,
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get("content-type"),
          bodySnippet: truncateBodySnippet(rawBody),
          hint: looksLikeHTML ? "Response looks like HTML (likely wrong URL/redirect/auth/WAF)" : undefined,
        })
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
        errors?: Array<{ message: string;[key: string]: unknown }>
      }

      if (json.errors && json.errors.length > 0) {
        const pretty = formatGraphQLErrors(json.errors)

        console.error("[v0] GraphQL errors:", {
          country: countryCode,
          endpoint: base,
          transport: usesGetTransport ? "GET" : "POST",
          persistedQueryId: options.persistedQueryId ?? null,
          // helpful without dumping the whole query
          queryPreview: options.persistedQueryId ? null : query.trim().slice(0, 180),
          variables,
          errors: pretty,
        })

        removeMemoizedEntry()
        return buildGraphQLFailureResult(json.errors)
      }


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
  }

export const __getMemoizedRequestsForTests = () => getMemoizedRequests()

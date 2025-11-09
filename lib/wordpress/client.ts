import { cache } from "react"
import { createHash } from "crypto"

import { getWordPressGraphQLAuthHeaders } from "@/config/env"
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

export function fetchWordPressGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[]>,
  options: FetchWordPressGraphQLOptions = {},
): Promise<T | null> {
  const base = getGraphQLEndpoint(countryCode)
  const body = JSON.stringify({ query, variables })
  const resolvedRevalidate = options.revalidate ?? CACHE_DURATIONS.MEDIUM
  const dedupedTags = dedupe(options.tags)
  const tagsKey = dedupedTags?.join(",") ?? ""
  const bodyHash = createHash("sha1").update(body).digest("hex")
  const cacheKey = `${base}::${bodyHash}::${tagsKey}`
  const metadataKey = String(resolvedRevalidate)
  const memoizedRequests = getMemoizedRequests()

  const cachedEntry = memoizedRequests.get(cacheKey) as
    | MemoizedRequestEntry
    | undefined
  if (cachedEntry) {
    const isExpired =
      cachedEntry.expiresAt !== Infinity && cachedEntry.expiresAt <= Date.now()
    if (isExpired) {
      memoizedRequests.delete(cacheKey)
    } else if (cachedEntry.metadataKey === metadataKey) {
      return cachedEntry.promise as Promise<T | null>
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }

  if (typeof window === "undefined") {
    const authHeaders = getWordPressGraphQLAuthHeaders()
    if (authHeaders) {
      for (const [key, value] of Object.entries(authHeaders)) {
        headers[key] = value
      }
    }
  }

  const requestPromise = fetchWithRetry(base, {
    method: "POST",
    headers,
    body,
    timeout: options.timeout,
    signal: options.signal,
    next: {
      revalidate: resolvedRevalidate,
      ...(dedupedTags ? { tags: dedupedTags } : {}),
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        console.error("[v0] GraphQL request failed:", res.status, res.statusText)
        throw new Error(`WordPress GraphQL request failed with status ${res.status}`)
      }

      const json = (await res.json()) as {
        data?: T
        errors?: Array<{ message: string; [key: string]: unknown }>
      }

      if (json.errors && json.errors.length > 0) {
        console.error("[v0] GraphQL errors:", json.errors)
        throw new Error("WordPress GraphQL response contained errors")
      }

      return (json.data ?? null) as T | null
    })
    .catch((error) => {
      console.error("[v0] GraphQL request exception:", error)
      return null
    })

  const expiresAt =
    resolvedRevalidate > 0
      ? Date.now() + resolvedRevalidate * 1000
      : Number.POSITIVE_INFINITY

  const entry: MemoizedRequestEntry = {
    promise: requestPromise,
    metadataKey,
    expiresAt,
  }
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

  return requestPromise
}

export const __getMemoizedRequestsForTests = () => getMemoizedRequests()

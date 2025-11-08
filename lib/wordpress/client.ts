import { cache } from "react"

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
}

const dedupe = (values?: readonly string[]): string[] | undefined => {
  if (!values?.length) {
    return undefined
  }

  return Array.from(new Set(values)).sort()
}

const FALLBACK_IN_FLIGHT_SYMBOL = Symbol.for("newsonafrica.wpGraphqlInFlight")

type InFlightRequestEntry = {
  promise: Promise<unknown>
  metadataKey: string
}

const getRequestScopedInFlight = cache(
  () => new Map<string, InFlightRequestEntry>(),
)

type GlobalWithInFlight = typeof globalThis & {
  [FALLBACK_IN_FLIGHT_SYMBOL]?: Map<string, InFlightRequestEntry>
}

const getInFlightRequests = (): Map<string, InFlightRequestEntry> => {
  const requestScoped = getRequestScopedInFlight()
  const validationCall = getRequestScopedInFlight()

  if (requestScoped === validationCall) {
    return requestScoped
  }

  const globalObject = globalThis as GlobalWithInFlight
  const globalStore = globalObject[FALLBACK_IN_FLIGHT_SYMBOL]

  if (globalStore) {
    return globalStore
  }

  const fallbackStore = new Map<string, InFlightRequestEntry>()
  globalObject[FALLBACK_IN_FLIGHT_SYMBOL] = fallbackStore
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
  const requestedRevalidateKey =
    options.revalidate === undefined ? "undefined" : String(options.revalidate)
  const tagsKey = dedupedTags?.join(",") ?? ""
  const metadataKey = `${requestedRevalidateKey}::${tagsKey}`
  const cacheKey = `${base}::${body}::${metadataKey}`
  const inFlightRequests = getInFlightRequests()

  const cachedEntry = inFlightRequests.get(cacheKey) as
    | InFlightRequestEntry
    | undefined
  if (cachedEntry && cachedEntry.metadataKey === metadataKey) {
    return cachedEntry.promise as Promise<T | null>
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

  const entry: InFlightRequestEntry = { promise: requestPromise, metadataKey }
  inFlightRequests.set(cacheKey, entry)
  requestPromise.finally(() => {
    const currentEntry = inFlightRequests.get(cacheKey)
    if (currentEntry === entry) {
      inFlightRequests.delete(cacheKey)
    }
  })

  return requestPromise
}

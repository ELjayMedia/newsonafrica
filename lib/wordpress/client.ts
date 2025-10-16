import { getGraphQLEndpoint, getRestBase } from "@/lib/wp-endpoints"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { appConfig } from "@/lib/config"
import { env } from "@/config/env"
import { fetchWithTimeout } from "../utils/fetchWithTimeout"
import { mapWpPost } from "../utils/mapWpPost"
import { APIError } from "../utils/errorHandling"
import * as log from "../log"
import type { CircuitBreakerManager } from "../api/circuit-breaker"
import { SUPPORTED_COUNTRIES as SUPPORTED_COUNTRY_EDITIONS } from "../editions"
import { getWordPressBasicAuthHeader } from "@/config/env"
import { getWordPressAuthorizationHeader } from "./auth"
import type { DeepMutable, WordPressPost } from "./types"

export type { DeepMutable, WordPressPost } from "./types"

export interface CountryConfig {
  code: string
  name: string
  flag: string
  apiEndpoint: string
  restEndpoint: string
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
      restEndpoint: getRestBase(edition.code),
      canonicalUrl: edition.canonicalUrl,
      hreflang: edition.hreflang,
      type: "country",
    }
    return acc
  },
  {} as Record<string, CountryConfig>,
)

const toErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const { message, name, stack } = error
    return { message, name, stack }
  }
  return { error }
}

const handleRestFallbackFailure = (
  message: string,
  context: Record<string, unknown>,
  error: unknown,
): never => {
  const details = {
    ...context,
    error: toErrorDetails(error),
  }
  log.error(message, details)
  throw new APIError(message, "REST_FALLBACK_FAILED", undefined, details)
}

let circuitBreakerInstance: CircuitBreakerManager | null = null
async function getCircuitBreaker(): Promise<CircuitBreakerManager> {
  if (!circuitBreakerInstance) {
    const { circuitBreaker } = await import("../api/circuit-breaker")
    circuitBreakerInstance = circuitBreaker
  }
  return circuitBreakerInstance
}

function encodeBasicAuth(username: string, password: string) {
  const bufferCtor = (globalThis as { Buffer?: { from(value: string): { toString(encoding: string): string } } }).Buffer
  if (bufferCtor?.from) {
    return bufferCtor.from(`${username}:${password}`).toString("base64")
  }
  const btoaFn = (globalThis as { btoa?: (value: string) => string }).btoa
  if (typeof btoaFn === "function") {
    return btoaFn(`${username}:${password}`)
  }
  throw new Error("Unable to encode WordPress credentials: no base64 encoder available")
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  headers["Authorization"] = getWordPressBasicAuthHeader()

  return headers
}

export const buildCacheTagParam = (tags: string[]): string => Array.from(new Set(tags)).sort().join("|")

export async function fetchFromWpGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[]>,
  tags?: string[],
): Promise<T | null> {
  const breaker = await getCircuitBreaker()
  const breakerKey = `wordpress-graphql-${countryCode}`
  const endpointMeta = { country: countryCode, endpoint: "graphql" }

  try {
    return await breaker.execute(
      breakerKey,
      async () => {
        const base = getGraphQLEndpoint(countryCode)
        console.log("[v0] GraphQL request to:", base)

        let logged = false
        try {
          const res = await fetchWithTimeout(base, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ query, variables }),
            next: {
              revalidate: CACHE_DURATIONS.MEDIUM,
              ...(tags && tags.length > 0 ? { tags } : {}),
            },
          })

          if (!res.ok) {
            logged = true
            console.error("[v0] GraphQL request failed:", res.status, res.statusText)
            log.error(`WordPress GraphQL request failed for ${base}`, {
              status: res.status,
              statusText: res.statusText,
            })
            throw new Error(`WordPress GraphQL request failed with status ${res.status}`)
          }

          const json = (await res.json()) as {
            data?: T
            errors?: Array<{ message: string; [key: string]: unknown }>
          }

          if (json.errors && json.errors.length > 0) {
            logged = true
            console.error("[v0] GraphQL errors:", json.errors)
            log.error(`WordPress GraphQL errors for ${base}`, { errors: json.errors })
            throw new Error("WordPress GraphQL response contained errors")
          }

          console.log("[v0] GraphQL request successful")
          return (json.data ?? null) as T | null
        } catch (error) {
          if (!logged) {
            console.error("[v0] GraphQL request exception:", error)
            log.error(`WordPress GraphQL request failed for ${base}`, { error })
          }
          throw error instanceof Error ? error : new Error("WordPress GraphQL request failed")
        }
      },
      undefined,
      endpointMeta,
    )
  } catch {
    return null
  }
}

export interface WithGraphqlFallbackLogMeta {
  operation: string
  [key: string]: unknown
}

interface WithGraphqlFallbackMessages {
  empty?: string
  error?: string
}

interface WithGraphqlFallbackOptions<TGraphqlResult, TResult> {
  fetchGraphql: () => Promise<TGraphqlResult | null | undefined>
  normalize: (data: TGraphqlResult | null | undefined) => TResult | null | undefined
  makeRestFallback: () => Promise<TResult>
  cacheTags?: string[]
  logMeta: WithGraphqlFallbackLogMeta
  messages?: WithGraphqlFallbackMessages
  onGraphqlEmpty?: () => void
  onGraphqlError?: (error: unknown) => void
}

export async function withGraphqlFallback<TGraphqlResult, TResult>({
  fetchGraphql,
  normalize,
  makeRestFallback,
  cacheTags,
  logMeta,
  messages,
  onGraphqlEmpty,
  onGraphqlError,
}: WithGraphqlFallbackOptions<TGraphqlResult, TResult>): Promise<TResult> {
  const { operation, ...meta } = logMeta
  const context: Record<string, unknown> = {
    ...meta,
    ...(cacheTags && cacheTags.length > 0 ? { cacheTags } : {}),
  }

  const emptyMessage = messages?.empty ?? `[v0] GraphQL returned no data for ${operation}`
  const errorMessage = messages?.error ?? `[v0] GraphQL request failed for ${operation}`

  try {
    const gqlResult = await fetchGraphql()
    const normalized = normalize(gqlResult)

    if (normalized !== null && normalized !== undefined) {
      return normalized
    }

    onGraphqlEmpty?.()
    if (messages?.empty !== undefined) {
      log.warn(emptyMessage, context)
    }
  } catch (error) {
    onGraphqlError?.(error)
    log.error(errorMessage, {
      ...context,
      error: toErrorDetails(error),
    })
    return makeRestFallback()
  }

  return makeRestFallback()
}

export async function fetchFromWp<T>(
  countryCode: string,
  query: {
    endpoint: string
    params?: Record<string, string | number | string[] | undefined>
    method?: string
    payload?: unknown
  },
  opts: { timeout?: number; withHeaders?: boolean; tags?: string[] } | number = {},
): Promise<{ data: T; headers: Headers } | T | null> {
  const normalizedOpts =
    typeof opts === "number"
      ? { timeout: opts, withHeaders: false, tags: undefined as string[] | undefined }
      : (opts ?? {})

  const { timeout = appConfig.wordpress.timeout, withHeaders = false, tags } = normalizedOpts
  const { method = "GET", payload, params: queryParams = {}, endpoint } = query

  const base = getRestBase(countryCode)
  const cacheTag = tags && tags.length > 0 ? buildCacheTagParam(tags) : undefined
  const searchParamsEntries = Object.entries(queryParams)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)])

  if (cacheTag) {
    searchParamsEntries.push(["cacheTag", cacheTag])
  }

  const params = new URLSearchParams(searchParamsEntries).toString()
  const url = `${base}/${endpoint}${params ? `?${params}` : ""}`

  const breaker = await getCircuitBreaker()
  const sanitizedEndpoint = query.endpoint.replace(/[^a-zA-Z0-9:_-]/g, "-")
  const breakerKey = `wordpress-rest-${countryCode}-${sanitizedEndpoint}`
  const endpointMeta = { country: countryCode, endpoint: `rest:${query.endpoint}` }

  try {
    return await breaker.execute(
      breakerKey,
      async () => {
        console.log("[v0] REST request to:", url)

        let logged = false
        try {
          const res = await fetchWithTimeout(url, {
            method,
            headers: getAuthHeaders(),
            next: {
              revalidate: CACHE_DURATIONS.MEDIUM,
              ...(tags && tags.length > 0 ? { tags } : {}),
            },
            ...(payload ? { body: JSON.stringify(payload) } : {}),
            timeout,
          })

          if (!res.ok) {
            logged = true
            console.error("[v0] REST request failed:", res.status, res.statusText)
            log.error(`WordPress API error ${res.status} for ${url}`, {
              statusText: res.statusText,
            })
            throw new Error(`WordPress REST request failed with status ${res.status}`)
          }

          const rawData = await res.json()
          let data: T

          if (query.endpoint.startsWith("posts")) {
            if (Array.isArray(rawData)) {
              data = rawData.map((p: WordPressPost) => mapWpPost(p, "rest", countryCode)) as T
            } else {
              data = mapWpPost(rawData as WordPressPost, "rest", countryCode) as T
            }
          } else {
            data = rawData as T
          }

          console.log("[v0] REST request successful")
          if (withHeaders) {
            return { data: data as T, headers: res.headers }
          }
          return data as T
        } catch (error) {
          if (!logged) {
            console.error("[v0] REST request exception:", error)
            log.error(`WordPress API request failed for ${url}`, { error })
          }
          throw error instanceof Error ? error : new Error("WordPress REST request failed")
        }
      },
      undefined,
      endpointMeta,
    )
  } catch {
    return null
  }
}

type RestFallbackContext = Record<string, unknown>

export async function executeRestFallback<T>(
  operation: () => Promise<T | null | undefined>,
  message: string,
  context: RestFallbackContext,
  options?: { fallbackValue: T },
): Promise<T> {
  const logFallbackUsage = (reason: "empty-result" | "error", error?: unknown) => {
    const meta = {
      ...context,
      reason,
      fallbackUsed: true,
      ...(error ? { error: toErrorDetails(error) } : {}),
    }
    log.warn(message, meta)
  }

  try {
    const result = await operation()
    if (result === null || result === undefined) {
      if (options) {
        logFallbackUsage("empty-result")
        return options.fallbackValue
      }
      throw new Error("REST fallback returned no data")
    }
    return result
  } catch (error) {
    if (options) {
      logFallbackUsage("error", error)
      return options.fallbackValue
    }
    handleRestFallbackFailure(message, context, error)
    throw error instanceof Error ? error : new Error("REST fallback failed")
  }
}

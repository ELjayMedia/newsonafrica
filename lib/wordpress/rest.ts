import { WP_AUTH_HEADERS } from "@/config/env"
import { getRestBase } from "@/lib/wp-endpoints"

import { fetchWithRetry, type FetchWithRetryOptions } from "../utils/fetchWithRetry"

export interface FetchWordPressRestOptions extends FetchWithRetryOptions {
  /**
   * Optional override for the REST base URL. Useful for hitting custom namespaces.
   */
  baseUrl?: string
}

const normalizeHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {}
  }

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof key === "string" && typeof value === "string") {
        acc[key] = value
      }
      return acc
    }, {})
  }

  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value
    }
    return acc
  }, {})
}

const buildRestUrl = (countryCode: string, path: string, baseUrl?: string): string => {
  const base = baseUrl ?? getRestBase(countryCode)
  const normalizedBase = base.endsWith("/") ? base : `${base}/`
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path
  return new URL(normalizedPath, normalizedBase).toString()
}

export async function fetchWordPressRest(
  countryCode: string,
  path: string,
  options: FetchWordPressRestOptions = {},
): Promise<Response> {
  const { headers: providedHeaders, baseUrl, ...restOptions } = options
  const headers = normalizeHeaders(providedHeaders)

  if (typeof window === "undefined" && WP_AUTH_HEADERS) {
    for (const [key, value] of Object.entries(WP_AUTH_HEADERS)) {
      headers[key] = value
    }
  }

  const url = buildRestUrl(countryCode, path, baseUrl)

  return fetchWithRetry(url, {
    ...restOptions,
    headers,
  })
}

export { buildRestUrl }
export type { FetchWithRetryOptions }

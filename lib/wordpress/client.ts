import { getGraphQLEndpoint } from "@/lib/wp-endpoints"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { fetchWithRetry } from "../utils/fetchWithRetry"
import * as log from "../log"
import { circuitBreaker } from "../api/circuit-breaker"
import { SUPPORTED_COUNTRIES as SUPPORTED_COUNTRY_EDITIONS } from "../editions"
import { getWordPressAuthHeaders } from "./auth"

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

export async function fetchFromWpGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[]>,
  tags?: string[],
): Promise<T | null> {
  const breaker = circuitBreaker
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
          const res = await fetchWithRetry(base, {
            method: "POST",
            headers: getWordPressAuthHeaders(),
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

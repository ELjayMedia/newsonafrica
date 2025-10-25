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
}

const dedupe = (values?: readonly string[]): string[] | undefined => {
  if (!values?.length) {
    return undefined
  }

  return Array.from(new Set(values))
}

export async function fetchWordPressGraphQL<T>(
  countryCode: string,
  query: string,
  variables?: Record<string, string | number | string[]>,
  options: FetchWordPressGraphQLOptions = {},
): Promise<T | null> {
  const base = getGraphQLEndpoint(countryCode)

  try {
    const res = await fetchWithRetry(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      next: {
        revalidate: options.revalidate ?? CACHE_DURATIONS.MEDIUM,
        ...(options.tags ? { tags: dedupe(options.tags) } : {}),
      },
    })

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
  } catch (error) {
    console.error("[v0] GraphQL request exception:", error)
    return null
  }
}

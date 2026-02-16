import { ENV } from "@/config/env"
import { isValidCountry, type CountryCode } from "@/lib/countries"

export interface GraphQLError {
  message: string
  path?: (string | number)[]
  extensions?: Record<string, unknown>
}

export interface GraphQLResponse<T = unknown> {
  data?: T
  errors?: GraphQLError[]
}

interface FetchOptions {
  tags?: string[]
  revalidate?: number
}

/**
 * Fetch from WPGraphQL with proper error handling and ISR tags
 */
export async function fetchGraphQL<T = unknown>(
  countryCode: CountryCode,
  query: string,
  variables?: Record<string, unknown>,
  options?: FetchOptions,
): Promise<T> {
  if (!isValidCountry(countryCode)) {
    throw new Error(`Invalid country code: ${countryCode}`)
  }

  const endpoint = getGraphQLEndpoint(countryCode)
  const tags = [
    `country-${countryCode}`,
    ...(options?.tags || []),
  ]

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: {
      tags,
      revalidate: options?.revalidate ?? 3600, // 1 hour default
    },
  })

  if (!response.ok) {
    throw new Error(`WPGraphQL request failed: ${response.status} ${response.statusText}`)
  }

  const json = (await response.json()) as GraphQLResponse<T>

  if (json.errors?.length) {
    const errorMessages = json.errors
      .map((e) => `${e.message}${e.path ? ` at ${e.path.join(".")}` : ""}`)
      .join("; ")
    throw new Error(`GraphQL error: ${errorMessages}`)
  }

  if (!json.data) {
    throw new Error("GraphQL response missing data")
  }

  return json.data
}

/**
 * Get endpoint for a country code
 */
function getGraphQLEndpoint(countryCode: CountryCode): string {
  const key = `NEXT_PUBLIC_WP_${countryCode.toUpperCase()}_GRAPHQL`
  const endpoint = process.env[key]

  if (!endpoint) {
    throw new Error(`Missing WPGraphQL endpoint for ${countryCode}. Set ${key} in env.`)
  }

  return endpoint
}

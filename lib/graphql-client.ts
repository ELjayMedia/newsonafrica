import { isValidCountry, type CountryCode } from "@/lib/countries"
import { GraphQLClientError, requestGraphQL } from "@/lib/graphql/client"

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

  const json = await requestGraphQL<T>(endpoint, {
    method: "POST",
    body: { query, variables },
    operationName: undefined,
    next: {
      tags,
      revalidate: options?.revalidate ?? 3600, // 1 hour default
    },
    logger: (metadata) => {
      const logLevel = metadata.status === "error" ? console.error : console.info
      logLevel("[graphql-client]", metadata)
    },
  })

  if (!json.data) {
    throw new GraphQLClientError("validation", "GraphQL response missing data", {
      endpoint,
      operationName: "UnknownOperation",
      attempt: 1,
      maxAttempts: 1,
      durationMs: 0,
    })
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

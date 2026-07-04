/**
 * Country codes supported by News on Africa.
 *
 * Add a new edition in exactly one place: append the code to
 * `SUPPORTED_COUNTRY_CODES` below. The `CountryCode` type, `isValidCountry`
 * guard, and all downstream consumers will update automatically.
 */
export const SUPPORTED_COUNTRY_CODES = ["sz", "za", "ng"] as const

export type CountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number]

/**
 * Type guard to validate country code
 */
export function isValidCountry(code: string): code is CountryCode {
  return (SUPPORTED_COUNTRY_CODES as readonly string[]).includes(code)
}

/**
 * Get WPGraphQL endpoint for a country
 */
export function getGraphQLEndpoint(countryCode: CountryCode): string {
  const envKey = `NEXT_PUBLIC_WP_${countryCode.toUpperCase()}_GRAPHQL`
  const endpoint = process.env[envKey]

  if (!endpoint) {
    throw new Error(`Missing environment variable: ${envKey}`)
  }

  return endpoint
}

export const COUNTRIES = {
  sz: { name: "Eswatini", code: "sz" },
  za: { name: "South Africa", code: "za" },
  ng: { name: "Nigeria", code: "ng" },
} as const

export const COUNTRY_LIST = Object.values(COUNTRIES)

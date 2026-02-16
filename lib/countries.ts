/** 
 * Country codes supported by News on Africa
 */
export type CountryCode = "sz" | "za" | "ng"

const SUPPORTED_CODES: CountryCode[] = ["sz", "za", "ng"]

/**
 * Type guard to validate country code
 */
export function isValidCountry(code: string): code is CountryCode {
  return SUPPORTED_CODES.includes(code as CountryCode)
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

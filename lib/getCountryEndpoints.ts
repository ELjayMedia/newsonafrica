export const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"

/**
 * Return GraphQL and REST endpoints for a specific country.
 */
export function getCountryEndpoints(countryCode?: string) {
  const code = countryCode || DEFAULT_COUNTRY
  return {
    graphql: `https://newsonafrica.com/${code}/graphql`,
    rest: `https://newsonafrica.com/${code}/wp-json/wp/v2`,
  }
}

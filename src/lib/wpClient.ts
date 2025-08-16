const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL || ''
const defaultCountry = process.env.NEXT_PUBLIC_WORDPRESS_COUNTRY_CODE || ''
const restRoot = process.env.NEXT_PUBLIC_REST_ROOT || '/wp-json/v2'
const graphqlRoot = process.env.NEXT_PUBLIC_GRAPHQL_ROOT || '/graphql'

function withCountry(path: string, country?: string) {
  const code = country || defaultCountry
  return code ? `/${code}${path}` : path
}

export function restEndpoint(path: string, country?: string) {
  return `${baseUrl}${withCountry(restRoot, country)}${path}`
}

export function graphqlEndpoint(country?: string) {
  return `${baseUrl}${withCountry(graphqlRoot, country)}`
}

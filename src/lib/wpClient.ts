const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL || ''
const restRoot = process.env.NEXT_PUBLIC_REST_ROOT || '/wp-json/v2'
const graphqlRoot = process.env.NEXT_PUBLIC_GRAPHQL_ROOT || '/graphql'
const defaultCountry = process.env.NEXT_PUBLIC_WORDPRESS_COUNTRY_CODE || ''

export const wpRest = (country = defaultCountry) =>
  `${baseUrl}${country ? `/${country}` : ''}${restRoot}`

export const wpGraphql = (country = defaultCountry) =>
  `${baseUrl}${country ? `/${country}` : ''}${graphqlRoot}`

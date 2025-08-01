interface EndpointOptions {
  /** Optional override for the default country code */
  defaultCountry?: string
  /** Optional override for the WordPress base URL */
  baseUrl?: string
}

function getCountryEndpoints(
  countryCode?: string,
  { defaultCountry, baseUrl }: EndpointOptions = {},
) {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_WP_BASE_URL
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_WP_BASE_URL is not defined and no baseUrl was provided',
    )
  }

  const resolvedDefault = defaultCountry ?? process.env.NEXT_PUBLIC_DEFAULT_COUNTRY
  if (!countryCode && !resolvedDefault) {
    throw new Error(
      'NEXT_PUBLIC_DEFAULT_COUNTRY is not defined and no defaultCountry was provided',
    )
  }

  const code = countryCode || resolvedDefault!
  const graphqlPath = code === '' ? '/graphql' : `/${code}/graphql`
  return {
    graphql: `${base}${graphqlPath}`,
    rest: `${base}/${code}/wp-json`,
  }
}

export { getCountryEndpoints }

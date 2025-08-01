function getCountryEndpoints(countryCode?: string) {
  const defaultCode = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY
  if (!defaultCode) {
    throw new Error('NEXT_PUBLIC_DEFAULT_COUNTRY is not defined')
  }

  const baseEnv = process.env.NEXT_PUBLIC_WP_BASE_URL
  if (!baseEnv) {
    throw new Error('NEXT_PUBLIC_WP_BASE_URL is not defined')
  }

  const base = baseEnv.replace(/\/+$/, '')
  const code = countryCode || defaultCode
  const graphqlPath = code === '' ? '/graphql' : `/${code}/graphql`
  const restPath = code === '' ? base : `${base}/${code}`
  return {
    graphql: `${base}${graphqlPath}`,
    rest: restPath,
  }
}

export { getCountryEndpoints }

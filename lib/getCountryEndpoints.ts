type CountryEndpoints = {
  graphql: string
  rest: string
  error?: string
}

function getCountryEndpoints(countryCode?: string): CountryEndpoints {
  const defaultCode = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || 'sz'
  if (!process.env.NEXT_PUBLIC_DEFAULT_COUNTRY) {
    console.warn(
      '[getCountryEndpoints] NEXT_PUBLIC_DEFAULT_COUNTRY is not defined. ' +
        'Falling back to "sz". Set NEXT_PUBLIC_DEFAULT_COUNTRY in your .env file.'
    )
  }

  const baseEnv = process.env.NEXT_PUBLIC_WP_BASE_URL
  if (!baseEnv) {
    const message =
      'NEXT_PUBLIC_WP_BASE_URL is not defined. Please set NEXT_PUBLIC_WP_BASE_URL in your .env file.'
    console.error(`[getCountryEndpoints] ${message}`)
    return { graphql: '', rest: '', error: message }
  }

  const base = baseEnv.replace(/\/+$/, '')
  const code = countryCode ?? defaultCode
  const graphqlPath = code === '' ? '/graphql' : `/${code}/graphql`
  const restPath = code === '' ? base : `${base}/${code}`
  return {
    graphql: `${base}${graphqlPath}`,
    rest: restPath,
  }
}

export { getCountryEndpoints }

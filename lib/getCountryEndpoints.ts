import { env } from "../config/env"

type CountryEndpoints = {
  graphql: string
  rest: string
  error?: string
}

function getCountryEndpoints(countryCode?: string): CountryEndpoints {
  const base = env.NEXT_PUBLIC_WP_BASE_URL.replace(/\/+$/, '')
  const code = countryCode ?? env.NEXT_PUBLIC_DEFAULT_COUNTRY
  const graphqlPath = code === '' ? '/graphql' : `/${code}/graphql`
  const restPath = code === '' ? base : `${base}/${code}`
  return {
    graphql: `${base}${graphqlPath}`,
    rest: restPath,
  }
}

export { getCountryEndpoints }

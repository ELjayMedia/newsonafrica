function getCountryEndpoints(countryCode?: string) {
  const defaultCode = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY!;
  const base = process.env.NEXT_PUBLIC_WP_BASE_URL!;
  const code = countryCode || defaultCode;
  const graphqlPath = code === '' ? '/graphql' : `/${code}/graphql`
  const restPath = code === '' ? base : `${base}/${code}`
  return {
    graphql: `${base}${graphqlPath}`,
    rest: restPath,
  }
}
export { getCountryEndpoints };

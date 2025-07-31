function getCountryEndpoints(countryCode?: string) {
  const defaultCode = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY!;
  const base = process.env.NEXT_PUBLIC_WP_BASE_URL!;
  const code = countryCode || defaultCode;
  const graphqlPath = code === '' ? '/graphql' : `/${code}/graphql`;
  return {
    graphql: `${base}${graphqlPath}`,
    rest: `${base}/${code}/wp-json`,
  };
}
export { getCountryEndpoints };

import { GraphQLClient } from 'graphql-request';
import { getWpEndpoints } from '@/config/wp';

export function gqlClient(countryIso?: string) {
  const url = getWpEndpoints(countryIso).graphql;
  return new GraphQLClient(url, { fetch });
}

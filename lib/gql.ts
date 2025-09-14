import { GraphQLClient } from 'graphql-request';
import { getWpEndpoints } from '@/config/wp';
import { fetchWithTimeout } from './utils/fetchWithTimeout';

export function gqlClient(countryIso?: string) {
  const url = getWpEndpoints(countryIso).graphql;
  return new GraphQLClient(url, { fetch: (input, init) => fetchWithTimeout(input, { ...init, timeout: 10000 }) });
}

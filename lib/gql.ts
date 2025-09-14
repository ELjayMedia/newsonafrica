import { GraphQLClient } from 'graphql-request';

const ENDPOINTS: Record<string, string> = {
  SZ: 'https://newsonafrica.com/sz/graphql',
  ZA: 'https://newsonafrica.com/za/graphql',
  DEFAULT: 'https://newsonafrica.com/graphql',
};

export function gqlClient(countryIso?: string) {
  const key = (countryIso || 'DEFAULT').toUpperCase();
  const url = ENDPOINTS[key] || ENDPOINTS.DEFAULT;
  return new GraphQLClient(url, { fetch });
}

import { env } from '@/config/env';

export function wpRestBase(country?: string) {
  // prefer country site when provided, else global
  return country
    ? `${env.WP_BASE_URL}/${country}/wp-json/wp/v2`
    : `${env.WP_BASE_URL}/wp-json/wp/v2`;
}

export function wpGraphqlBase(country?: string) {
  return country ? `${env.WP_BASE_URL}/${country}/graphql` : `${env.WP_BASE_URL}/graphql`;
}

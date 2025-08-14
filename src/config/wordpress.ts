import { env } from './env';

const COUNTRY_CODE = process.env.NEXT_PUBLIC_COUNTRY_CODE || 'sz';

export const WORDPRESS_GRAPHQL_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_API_URL || `${env.WP_BASE_URL}/${COUNTRY_CODE}/graphql`;

export const WORDPRESS_REST_API_URL =
  process.env.WORDPRESS_REST_API_URL || `${env.WP_BASE_URL}/${COUNTRY_CODE}/wp-json/wp/v2`;

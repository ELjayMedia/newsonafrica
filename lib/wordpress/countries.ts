/**
 * Country editions supported by News on Africa (NOA-85/86).
 *
 * WordPress is a single multisite installation; each country edition lives
 * under a subpath of `serverEnv.WORDPRESS_API_URL`:
 *   REST:    `${WORDPRESS_API_URL}/<country>/wp-json/wp/v2`
 *   GraphQL: `${WORDPRESS_API_URL}/<country>/graphql`
 *
 * The country catalogue itself lives in `@/lib/countries` (client-safe, no
 * `server-only`) so the country switcher (NOA-92) can share it; this module
 * re-exports it and adds the server-only URL builders that need
 * `serverEnv`. Add a new edition in exactly one place: `@/lib/countries`.
 */
import "server-only";

import { serverEnv } from "@/lib/env";
import {
  COUNTRIES,
  COUNTRY_LIST,
  DEFAULT_COUNTRY,
  isValidCountry,
  SUPPORTED_COUNTRY_CODES,
  type CountryCode,
  type CountryConfig,
} from "@/lib/countries";

export { COUNTRIES, COUNTRY_LIST, DEFAULT_COUNTRY, isValidCountry, SUPPORTED_COUNTRY_CODES };
export type { CountryCode, CountryConfig };

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeCountry(country: string): CountryCode {
  const normalized = country.trim().toLowerCase();
  return isValidCountry(normalized) ? normalized : DEFAULT_COUNTRY;
}

/** REST API base for a country, e.g. `https://cms.example.com/sz/wp-json/wp/v2`. */
export function getRestBase(country: string = DEFAULT_COUNTRY): string {
  const base = trimTrailingSlashes(serverEnv.WORDPRESS_API_URL);
  const code = normalizeCountry(country);
  return `${base}/${code}/wp-json/wp/v2`;
}

/** GraphQL endpoint for a country, e.g. `https://cms.example.com/sz/graphql`. */
export function getGraphQLEndpoint(country: string = DEFAULT_COUNTRY): string {
  const base = trimTrailingSlashes(serverEnv.WORDPRESS_API_URL);
  const code = normalizeCountry(country);
  return `${base}/${code}/graphql`;
}

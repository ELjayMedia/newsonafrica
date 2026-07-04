/**
 * Country editions supported by News on Africa (NOA-85/86).
 *
 * WordPress is a single multisite installation by default; each country edition
 * lives under a subpath of `serverEnv.WORDPRESS_API_URL`:
 *   REST:    `${WORDPRESS_API_URL}/<country>/wp-json/wp/v2`
 *   GraphQL: `${WORDPRESS_API_URL}/<country>/graphql`
 *
 * A country may also provide an explicit endpoint override. This keeps launch
 * unblocked when a country edition lives on a different WordPress host/path,
 * while preserving the multisite fallback for all other editions.
 */
import "server-only";

import { publicEnv, serverEnv } from "@/lib/env";
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

function getRestOverride(country: CountryCode): string | undefined {
  if (country === "ng") return publicEnv.NEXT_PUBLIC_WP_NG_REST_BASE;
  return undefined;
}

function getGraphQLOverride(country: CountryCode): string | undefined {
  if (country === "ng") return publicEnv.NEXT_PUBLIC_WP_NG_GRAPHQL;
  return undefined;
}

/** REST API base for a country, e.g. `https://cms.example.com/sz/wp-json/wp/v2`. */
export function getRestBase(country: string = DEFAULT_COUNTRY): string {
  const code = normalizeCountry(country);
  const override = getRestOverride(code);
  if (override) return trimTrailingSlashes(override);

  const base = trimTrailingSlashes(serverEnv.WORDPRESS_API_URL);
  return `${base}/${code}/wp-json/wp/v2`;
}

/** GraphQL endpoint for a country, e.g. `https://cms.example.com/sz/graphql`. */
export function getGraphQLEndpoint(country: string = DEFAULT_COUNTRY): string {
  const code = normalizeCountry(country);
  const override = getGraphQLOverride(code);
  if (override) return trimTrailingSlashes(override);

  const base = trimTrailingSlashes(serverEnv.WORDPRESS_API_URL);
  return `${base}/${code}/graphql`;
}

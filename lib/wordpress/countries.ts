/**
 * Country editions supported by News on Africa (NOA-85/86).
 *
 * WordPress is a single multisite installation; each country edition lives
 * under a subpath of `serverEnv.WORDPRESS_API_URL`:
 *   REST:    `${WORDPRESS_API_URL}/<country>/wp-json/wp/v2`
 *   GraphQL: `${WORDPRESS_API_URL}/<country>/graphql`
 *
 * Add a new edition in exactly one place: append it to `COUNTRIES` below.
 */
import "server-only";

import { serverEnv } from "@/lib/env";

export const SUPPORTED_COUNTRY_CODES = ["sz", "za", "ng"] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number];

export function isValidCountry(code: string): code is CountryCode {
  return (SUPPORTED_COUNTRY_CODES as readonly string[]).includes(code);
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  sz: { code: "sz", name: "Eswatini" },
  za: { code: "za", name: "South Africa" },
  ng: { code: "ng", name: "Nigeria" },
};

export const COUNTRY_LIST: CountryConfig[] = Object.values(COUNTRIES);

export const DEFAULT_COUNTRY: CountryCode = "sz";

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

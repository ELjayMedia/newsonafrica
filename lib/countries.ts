/**
 * Country/edition catalogue (NOA-85/86, extended NOA-92 for the client-side
 * country switcher). Deliberately free of server-only imports so both server
 * code (`lib/wordpress/countries.ts`, the DAL) and client components (the
 * country switcher) can share a single source of truth for "which countries
 * exist" without pulling in `server-only`/`lib/env`.
 *
 * Add a new edition in exactly one place: append it to `COUNTRIES` below.
 */

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

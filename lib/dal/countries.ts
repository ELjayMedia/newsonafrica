/**
 * Country/edition lookups (NOA-86). Thin domain wrapper around
 * `@/lib/wordpress/countries` — no network calls, country list is static.
 */
import "server-only";

import {
  COUNTRY_LIST,
  DEFAULT_COUNTRY,
  isValidCountry,
  type CountryCode,
} from "@/lib/wordpress/countries";
import type { Country } from "@/lib/dal/types";

export { isValidCountry, DEFAULT_COUNTRY };
export type { CountryCode };

export function listCountries(): Country[] {
  return COUNTRY_LIST.map((c) => ({ code: c.code, name: c.name }));
}

export function getCountry(code: string): Country | null {
  const match = COUNTRY_LIST.find((c) => c.code === code.toLowerCase());
  return match ? { code: match.code, name: match.name } : null;
}

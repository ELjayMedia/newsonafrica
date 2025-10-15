import type { CountryEdition } from "./editions"
import { SUPPORTED_COUNTRIES } from "./editions"

export type PublicCountry = Pick<
  CountryEdition,
  "code" | "name" | "flag" | "canonicalUrl" | "hreflang"
>

const toPublicCountry = (country: CountryEdition): PublicCountry => ({
  code: country.code,
  name: country.name,
  flag: country.flag,
  canonicalUrl: country.canonicalUrl,
  hreflang: country.hreflang,
})

export const PUBLIC_COUNTRIES_LIST: PublicCountry[] = SUPPORTED_COUNTRIES.map(toPublicCountry)

export const PUBLIC_COUNTRIES_BY_CODE: Record<string, PublicCountry> = PUBLIC_COUNTRIES_LIST.reduce(
  (acc, country) => {
    acc[country.code] = country
    return acc
  },
  {} as Record<string, PublicCountry>,
)

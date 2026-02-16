import { getWpEndpoints } from "@/config/wp"
import { SITE_BASE_URL } from "@/lib/site-url"

export type EditionType = "country" | "african"

interface BaseEdition {
  code: string
  name: string
  flag: string
  canonicalUrl: string
  hreflang: string
}

export interface CountryEdition extends BaseEdition {
  type: "country"
  apiEndpoint: string
}

export interface AfricanEdition extends BaseEdition {
  type: "african"
}

export type SupportedEdition = CountryEdition | AfricanEdition

const COUNTRY_DEFINITIONS: Array<Omit<CountryEdition, "type" | "apiEndpoint">> = [
  {
    code: "sz",
    name: "Eswatini",
    flag: "🇸🇿",
    canonicalUrl: `${SITE_BASE_URL}/sz`,
    hreflang: "en-SZ",
  },
  {
    code: "za",
    name: "South Africa",
    flag: "🇿🇦",
    canonicalUrl: `${SITE_BASE_URL}/za`,
    hreflang: "en-ZA",
  },
  {
    code: "ng",
    name: "Nigeria",
    flag: "🇳🇬",
    canonicalUrl: `${SITE_BASE_URL}/ng`,
    hreflang: "en-NG",
  },
]

export const SUPPORTED_COUNTRIES: CountryEdition[] = COUNTRY_DEFINITIONS.map((country) => ({
  ...country,
  type: "country",
  apiEndpoint: getWpEndpoints(country.code).graphql,
}))

export const AFRICAN_EDITION: AfricanEdition = {
  type: "african",
  code: "african-edition",
  name: "African Edition",
  flag: "🌍",
  canonicalUrl: SITE_BASE_URL,
  hreflang: "x-default",
}

export const SUPPORTED_EDITIONS: SupportedEdition[] = [AFRICAN_EDITION, ...SUPPORTED_COUNTRIES]

export const isCountryEdition = (edition: SupportedEdition): edition is CountryEdition =>
  edition.type === "country"

export const isAfricanEdition = (edition: SupportedEdition): edition is AfricanEdition =>
  edition.type === "african"

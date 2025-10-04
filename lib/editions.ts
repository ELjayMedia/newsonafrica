import { getWpEndpoints } from "@/config/wp"

export type EditionType = "country" | "african"

interface BaseEdition {
  code: string
  name: string
  flag: string
}

export interface CountryEdition extends BaseEdition {
  type: "country"
  apiEndpoint: string
  restEndpoint: string
}

export interface AfricanEdition extends BaseEdition {
  type: "african"
}

export type SupportedEdition = CountryEdition | AfricanEdition

const COUNTRY_DEFINITIONS: Array<Omit<CountryEdition, "type" | "apiEndpoint" | "restEndpoint">> = [
  {
    code: "sz",
    name: "Eswatini",
    flag: "🇸🇿",
  },
  {
    code: "za",
    name: "South Africa",
    flag: "🇿🇦",
  },
]

export const SUPPORTED_COUNTRIES: CountryEdition[] = COUNTRY_DEFINITIONS.map((country) => ({
  ...country,
  type: "country",
  apiEndpoint: getWpEndpoints(country.code).graphql,
  restEndpoint: getWpEndpoints(country.code).rest,
}))

export const AFRICAN_EDITION: AfricanEdition = {
  type: "african",
  code: "african-edition",
  name: "African Edition",
  flag: "🌍",
}

export const SUPPORTED_EDITIONS: SupportedEdition[] = [AFRICAN_EDITION, ...SUPPORTED_COUNTRIES]

export const isCountryEdition = (edition: SupportedEdition): edition is CountryEdition =>
  edition.type === "country"

export const isAfricanEdition = (edition: SupportedEdition): edition is AfricanEdition =>
  edition.type === "african"

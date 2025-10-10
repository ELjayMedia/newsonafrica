import { COUNTRY_DEFINITIONS } from "./editions"

export interface CountryMetadata {
  code: string
  name: string
  flag: string
}

export const COUNTRY_METADATA: CountryMetadata[] = COUNTRY_DEFINITIONS.map(
  ({ code, name, flag }) => ({
    code,
    name,
    flag,
  }),
)

export const COUNTRY_METADATA_MAP: Record<string, CountryMetadata> =
  COUNTRY_METADATA.reduce<Record<string, CountryMetadata>>((acc, country) => {
    acc[country.code] = country
    return acc
  }, {})

export const COUNTRY_CODES = COUNTRY_METADATA.map((country) => country.code)

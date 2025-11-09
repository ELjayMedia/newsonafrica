import { SUPPORTED_COUNTRIES } from "@/lib/editions"

export const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()

export type SearchScope = { type: "country"; country: string } | { type: "panAfrican" }

export type SearchSortMode = "relevance" | "latest"

const supportedCountryCodes = new Set(
  SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase()),
)

export const parseScope = (value: string | null | undefined): SearchScope => {
  if (!value) {
    return { type: "country", country: DEFAULT_COUNTRY }
  }

  const normalized = value.trim().toLowerCase()

  if (["all", "pan", "africa", "pan-africa", "african"].includes(normalized)) {
    return { type: "panAfrican" }
  }

  if (supportedCountryCodes.has(normalized)) {
    return { type: "country", country: normalized }
  }

  return { type: "country", country: DEFAULT_COUNTRY }
}

const SORT_ALIASES: Record<string, SearchSortMode> = {
  latest: "latest",
  recent: "latest",
  newest: "latest",
}

export const parseSort = (value: string | null | undefined): SearchSortMode => {
  if (!value) {
    return "relevance"
  }

  const normalized = value.trim().toLowerCase()

  if (normalized in SORT_ALIASES) {
    return SORT_ALIASES[normalized]
  }

  return "relevance"
}

export const normalizeQuery = (value: string | null): string => (value ?? "").replace(/\s+/g, " ").trim()

export type NormalizedBaseSearchParams = {
  query: string
  scope: SearchScope
  sort: SearchSortMode
}

export const normalizeBaseSearchParams = (
  searchParams: URLSearchParams,
): NormalizedBaseSearchParams => {
  const query = normalizeQuery(searchParams.get("q") ?? searchParams.get("query"))
  const scope = parseScope(searchParams.get("country") ?? searchParams.get("scope"))
  const sort = parseSort(searchParams.get("sort"))

  return { query, scope, sort }
}

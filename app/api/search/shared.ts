import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import type { AlgoliaSortMode } from "@/lib/algolia/client"

export const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_SITE || "sz").toLowerCase()

export type SearchScope = { type: "country"; country: string } | { type: "panAfrican" }

const supportedCountryCodes = new Set(SUPPORTED_COUNTRIES.map((country) => country.code.toLowerCase()))

const SORT_ALIASES: Record<string, AlgoliaSortMode> = {
  latest: "latest",
  recent: "latest",
  newest: "latest",
}

export const normalizeQuery = (value: string | null): string => (value ?? "").replace(/\s+/g, " ").trim()

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

export const parseSort = (value: string | null | undefined): AlgoliaSortMode => {
  if (!value) {
    return "relevance"
  }

  const normalized = value.trim().toLowerCase()

  if (normalized in SORT_ALIASES) {
    return SORT_ALIASES[normalized]
  }

  return "relevance"
}

export const normalizeIntegerParam = (
  value: string | null,
  { fallback, min, max }: { fallback: number; min: number; max?: number },
): number => {
  const parsed = Number.parseInt(value ?? "", 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  const clamped = Math.max(min, parsed)
  return typeof max === "number" ? Math.min(clamped, max) : clamped
}

export type NormalizedBaseSearchParams = {
  query: string
  scope: SearchScope
  sort: AlgoliaSortMode
}

export const normalizeBaseSearchParams = (searchParams: URLSearchParams): NormalizedBaseSearchParams => {
  const query = normalizeQuery(searchParams.get("q") ?? searchParams.get("query"))
  const sort = parseSort(searchParams.get("sort"))
  const scope = parseScope(searchParams.get("country") ?? searchParams.get("scope"))

  return { query, sort, scope }
}

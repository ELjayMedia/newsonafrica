import { ENV } from "@/config/env"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS, isCountryEdition, type SupportedEdition } from "@/lib/editions"
import { buildArticlePath, normalizeArticleCountrySegment } from "@/lib/routing/article-route"

export const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"

export const normalizeCountryCode = (countryCode: string): string => countryCode.toLowerCase()
export const normalizeSlug = (value: string): string => value.toLowerCase()

const SUPPORTED_EDITION_LOOKUP = new Map(SUPPORTED_EDITIONS.map((edition) => [edition.code.toLowerCase(), edition]))

export const AFRICAN_ROUTE_ALIAS = normalizeArticleCountrySegment(AFRICAN_EDITION.code)
export const normalizeRouteCountry = (country: string): string => normalizeArticleCountrySegment(country)

export const resolveEdition = (countryCode: string): SupportedEdition | null => {
  const normalized = normalizeCountryCode(countryCode)
  if (normalized === AFRICAN_ROUTE_ALIAS) return AFRICAN_EDITION
  return SUPPORTED_EDITION_LOOKUP.get(normalized) ?? null
}

export const sanitizeBaseUrl = (value: string): string => value.replace(/\/$/, "")

export type ParsedArticleSlug = {
  normalizedSlug: string
  stableId: number | null
}

export const parseArticleSlugParam = (value: string): ParsedArticleSlug => {
  const normalizedSlug = normalizeSlug(value)
  const parts = normalizedSlug.split("-")
  const candidate = parts.at(-1)
  const stableId = candidate && /^\d+$/.test(candidate) ? Number.parseInt(candidate, 10) : null

  return {
    normalizedSlug,
    stableId: stableId != null && Number.isFinite(stableId) ? stableId : null,
  }
}

export const buildCanonicalArticleSlug = (slug: string, databaseId?: number | null): string => {
  const canonicalPath = buildArticlePath({
    countryCode: AFRICAN_ROUTE_ALIAS,
    slug,
    databaseId,
  })

  return canonicalPath.split("/").at(-1) ?? normalizeSlug(slug)
}

export const buildArticleCountryPriority = (countryCode: string): string[] => {
  const normalizedPrimary = normalizeCountryCode(countryCode)
  const defaultSite = normalizeCountryCode(ENV.NEXT_PUBLIC_DEFAULT_SITE)
  const supportedCountryEditions = SUPPORTED_EDITIONS.filter(isCountryEdition).map((edition) => normalizeCountryCode(edition.code))

  return Array.from(new Set([normalizedPrimary, defaultSite, ...supportedCountryEditions]))
}

export const resetArticleCountryPriorityCache = (): void => {}

import { AFRICAN_EDITION } from "@/lib/editions"

const normalizeCountryCode = (value: string): string => value.toLowerCase()
const normalizeSlug = (value: string): string => value.toLowerCase()
const AFRICAN_ROUTE_ALIAS = "african"

export function normalizeArticleCountrySegment(countryCode: string): string {
  const normalized = normalizeCountryCode(countryCode)

  if (normalized === AFRICAN_ROUTE_ALIAS) {
    return AFRICAN_ROUTE_ALIAS
  }

  if (normalized === normalizeCountryCode(AFRICAN_EDITION.code)) {
    return AFRICAN_ROUTE_ALIAS
  }

  return normalized
}

export function buildArticlePath({
  countryCode,
  slug,
  databaseId,
}: {
  countryCode: string
  slug: string
  databaseId?: number | null
}): string {
  const canonicalSlug =
    typeof databaseId === "number" && Number.isFinite(databaseId)
      ? `${normalizeSlug(slug)}-${databaseId}`
      : normalizeSlug(slug)

  return `/${normalizeArticleCountrySegment(countryCode)}/article/${canonicalSlug}`
}

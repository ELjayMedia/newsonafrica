interface BuildArticleRouteArgs {
  slug: string
  countryCode: string
  databaseId?: number | null
}

const normalizeCountry = (value: string) => value.toLowerCase()

export function buildArticlePath({ slug, countryCode, databaseId }: BuildArticleRouteArgs): string {
  const country = normalizeCountry(countryCode)
  const normalizedSlug = slug.toLowerCase()
  const canonicalSlug =
    typeof databaseId === "number" && Number.isFinite(databaseId)
      ? `${normalizedSlug}-${databaseId}`
      : normalizedSlug

  return `/${country}/article/${canonicalSlug}`
}

export function buildArticleUrl(baseUrl: string, args: BuildArticleRouteArgs): string {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "")
  return `${normalizedBaseUrl}${buildArticlePath(args)}`
}

export type { BuildArticleRouteArgs }

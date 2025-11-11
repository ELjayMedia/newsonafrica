import { notFound, redirect } from "next/navigation"

import {
  buildArticleCountryPriority,
  loadArticleWithFallback,
  normalizeCountryCode,
  normalizeRouteCountry,
  normalizeSlug,
  resolveEdition,
} from "../article/[slug]/article-data"

const RESERVED_SLUGS = new Set(["article", "category"])

type LegacyArticleRedirectParams = {
  params: Promise<{ countryCode: string; slug: string }>
}

export const dynamic = "force-dynamic"
export const dynamicParams = true

export default async function LegacyArticleRedirect({
  params,
}: LegacyArticleRedirectParams) {
  const { countryCode, slug } = await params
  const normalizedSlug = normalizeSlug(slug)

  if (RESERVED_SLUGS.has(normalizedSlug)) {
    notFound()
  }

  const edition = resolveEdition(countryCode)

  if (!edition) {
    notFound()
  }

  const editionCountry = normalizeCountryCode(edition.code)
  const routeCountry = normalizeRouteCountry(countryCode)
  const countryPriority = buildArticleCountryPriority(editionCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)

  if (resolvedArticle.status === "not_found") {
    notFound()
  }

  const targetCountry =
    resolvedArticle.status === "found"
      ? resolvedArticle.sourceCountry ?? editionCountry
      : resolvedArticle.staleSourceCountry ?? editionCountry

  const redirectCountry = normalizeRouteCountry(targetCountry ?? routeCountry)

  redirect(`/${redirectCountry}/article/${normalizedSlug}`)
}

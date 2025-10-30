import { notFound, redirect } from "next/navigation"

import { env } from "@/config/env"
import { AFRICAN_EDITION } from "@/lib/editions"

import {
  buildArticleCountryPriority,
  loadArticleWithFallback,
  normalizeCountryCode,
  normalizeSlug,
} from "@/app/[countryCode]/article/[slug]/article-data"

const AFRICAN_ROUTE_ALIAS = "african"

const normalizeRouteCountry = (country: string): string => {
  const normalized = normalizeCountryCode(country)

  if (normalized === AFRICAN_ROUTE_ALIAS) {
    return AFRICAN_ROUTE_ALIAS
  }

  const normalizedAfricanCode = normalizeCountryCode(AFRICAN_EDITION.code)
  if (normalized === normalizedAfricanCode) {
    return AFRICAN_ROUTE_ALIAS
  }

  return normalized
}

type RouteParams = { slug: string }
type RouteParamsPromise = { params: Promise<RouteParams> }

export default async function ArticleRedirectPage({ params }: RouteParamsPromise) {
  const { slug } = await params
  const normalizedSlug = normalizeSlug(slug)

  if (!normalizedSlug) {
    notFound()
  }

  const defaultCountry = normalizeCountryCode(env.NEXT_PUBLIC_DEFAULT_SITE)
  const countryPriority = buildArticleCountryPriority(defaultCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)

  if (!resolvedArticle) {
    notFound()
  }

  const targetCountry = normalizeRouteCountry(resolvedArticle.sourceCountry ?? defaultCountry)

  redirect(`/${targetCountry}/article/${normalizedSlug}`)
}

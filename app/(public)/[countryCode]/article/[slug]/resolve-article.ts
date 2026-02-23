import { cache } from "react"
import { draftMode } from "next/headers"

import { isCountryEdition } from "@/lib/editions"
import { ENV } from "@/config/env"
import type { WordPressPost } from "@/types/wp"

import {
  buildArticleCountryPriority,
  buildCanonicalArticleSlug,
  loadArticleWithFallback,
  normalizeCountryCode,
  normalizeRouteCountry,
  parseArticleSlugParam,
  resolveEdition,
  sanitizeBaseUrl,
} from "./article-data"

export type ResolveArticleStatus = "found" | "not_found" | "temporary_error"

export type ResolveArticleFailureMetadata = {
  isTemporaryError: true
  error: unknown
  errorDigest?: string
  failureCountries?: string[]
  staleArticle?: WordPressPost | null
  countryPriority: string[]
  parsedSlug: string
  stableId: number | null
  preview: boolean
}

export type ResolveArticleResult = {
  status: ResolveArticleStatus
  articleData: WordPressPost | null
  resolvedSourceCountry: string | null
  resolvedCanonicalCountry: string | null
  targetCountry: string
  canonicalSlug: string
  canonicalUrl: string
  articleVersion: string | null
  failureMetadata: ResolveArticleFailureMetadata | null
}

export const resolveArticle = cache(async ({
  countryCode,
  slug,
  preview,
}: {
  countryCode: string
  slug: string
  preview?: boolean
}): Promise<ResolveArticleResult> => {
  const routeCountryAlias = normalizeRouteCountry(countryCode)
  const edition = resolveEdition(countryCode)
  const { normalizedSlug: parsedSlug, stableId } = parseArticleSlugParam(slug)
  const resolvedPreview = preview ?? (await draftMode()).isEnabled
  const baseUrl = sanitizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)

  if (!edition) {
    const canonicalUrl = `${baseUrl}/${routeCountryAlias}/article/${parsedSlug}`

    return {
      status: "not_found",
      articleData: null,
      resolvedSourceCountry: null,
      resolvedCanonicalCountry: null,
      targetCountry: routeCountryAlias,
      canonicalSlug: parsedSlug,
      canonicalUrl,
      articleVersion: null,
      failureMetadata: null,
    }
  }

  const editionCountry = normalizeCountryCode(edition.code)
  const countryPriority = buildArticleCountryPriority(editionCountry)
  const resolvedArticle = await loadArticleWithFallback(parsedSlug, countryPriority, resolvedPreview, {}, stableId)

  const resolvedSourceCountry =
    resolvedArticle.status === "found"
      ? (resolvedArticle.sourceCountry ?? editionCountry)
      : editionCountry

  const resolvedCanonicalCountry =
    resolvedArticle.status === "found"
      ? (resolvedArticle.canonicalCountry ?? resolvedSourceCountry ?? editionCountry)
      : editionCountry

  const targetCountry = isCountryEdition(edition)
    ? normalizeRouteCountry(resolvedCanonicalCountry ?? editionCountry)
    : routeCountryAlias

  const articleData = resolvedArticle.status === "found" ? resolvedArticle.article : null
  const articleVersion = resolvedArticle.status === "found" ? resolvedArticle.version : null
  const canonicalSlug = buildCanonicalArticleSlug(articleData?.slug ?? parsedSlug, articleData?.databaseId)
  const canonicalUrl = `${baseUrl}/${targetCountry}/article/${canonicalSlug}`

  const errorDigest =
    resolvedArticle.status === "temporary_error" &&
    typeof (resolvedArticle.error as { digest?: unknown })?.digest === "string"
      ? (resolvedArticle.error as { digest?: string }).digest
      : undefined

  return {
    status: resolvedArticle.status,
    articleData,
    resolvedSourceCountry,
    resolvedCanonicalCountry,
    targetCountry,
    canonicalSlug,
    canonicalUrl,
    articleVersion,
    failureMetadata:
      resolvedArticle.status === "temporary_error"
        ? {
            isTemporaryError: true,
            error: resolvedArticle.error,
            errorDigest,
            failureCountries: resolvedArticle.failures?.map(({ country }) => country),
            staleArticle: resolvedArticle.staleArticle ?? null,
            countryPriority,
            parsedSlug,
            stableId,
            preview: resolvedPreview,
          }
        : null,
  }
})

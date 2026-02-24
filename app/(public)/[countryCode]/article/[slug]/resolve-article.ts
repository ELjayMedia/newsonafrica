import { cache } from "react"
import { draftMode } from "next/headers"

import { ENV } from "@/config/env"
import { isCountryEdition } from "@/lib/editions"
import { getArticleBySlug } from "@/lib/wordpress/article-data"
import type { WordPressPost } from "@/types/wp"

import {
  buildCanonicalArticleSlug,
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

  const loaded = await getArticleBySlug({ countryCode: normalizeCountryCode(edition.code), slug: parsedSlug, preview: resolvedPreview })

  const resolvedSourceCountry = loaded.sourceCountryCode ?? normalizeCountryCode(edition.code)
  const resolvedCanonicalCountry = loaded.canonicalCountryCode ?? resolvedSourceCountry

  const targetCountry = isCountryEdition(edition)
    ? normalizeRouteCountry(resolvedCanonicalCountry)
    : routeCountryAlias

  const articleData = loaded.status === "found" ? loaded.article : null
  const canonicalSlug = buildCanonicalArticleSlug(articleData?.slug ?? parsedSlug, articleData?.databaseId)
  const canonicalUrl = `${baseUrl}/${targetCountry}/article/${canonicalSlug}`

  return {
    status: loaded.status,
    articleData,
    resolvedSourceCountry,
    resolvedCanonicalCountry,
    targetCountry,
    canonicalSlug,
    canonicalUrl,
    articleVersion: loaded.version,
    failureMetadata:
      loaded.status === "temporary_error"
        ? {
            isTemporaryError: true,
            error: loaded.failures?.[0]?.error,
            failureCountries: loaded.failures?.map((failure) => failure.country),
            staleArticle: null,
            countryPriority: [resolvedSourceCountry],
            parsedSlug,
            stableId,
            preview: resolvedPreview,
          }
        : null,
  }
})

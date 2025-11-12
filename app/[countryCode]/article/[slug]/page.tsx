import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { ENV } from "@/config/env"
import { stripHtml } from "@/lib/search"
import { isCountryEdition } from "@/lib/editions"
import { getRelatedPostsForCountry } from "@/lib/wordpress/posts"

import {
  PLACEHOLDER_IMAGE_PATH,
  buildArticleCountryPriority,
  loadArticleWithFallback,
  normalizeCountryCode,
  normalizeRouteCountry,
  normalizeSlug,
  resolveEdition,
  sanitizeBaseUrl,
  ARTICLE_PAGE_REVALIDATE_SECONDS,
} from "./article-data"

import { ArticleClientContent } from "./ArticleClientContent"

export const revalidate = 600

if (process.env.NODE_ENV !== "production") {
  const expectedRevalidateSeconds = revalidate
  if (ARTICLE_PAGE_REVALIDATE_SECONDS !== expectedRevalidateSeconds) {
    throw new Error(
      `ARTICLE_PAGE_REVALIDATE_SECONDS (${ARTICLE_PAGE_REVALIDATE_SECONDS}) does not match ISR TTL (${expectedRevalidateSeconds})`,
    )
  }
}
export const dynamicParams = true

type RouteParams = { params: { countryCode: string; slug: string } }
type RouteParamsPromise = { params: Promise<RouteParams["params"]> }

const resolveRelatedPostId = (article: {
  databaseId?: number | null
  id?: unknown
} | null | undefined) => {
  if (typeof article?.databaseId === "number" && Number.isFinite(article.databaseId)) {
    return article.databaseId
  }

  const relayId = article?.id
  if (typeof relayId !== "string") {
    return null
  }

  const decodedId = Number(relayId.split(":").pop())
  return Number.isFinite(decodedId) ? decodedId : null
}

const buildDynamicOgUrl = (baseUrl: string, countryCode: string, slug: string) =>
  `${baseUrl}/${countryCode}/article/${slug}/opengraph-image`

const buildPlaceholderUrl = (baseUrl: string) => `${baseUrl}${PLACEHOLDER_IMAGE_PATH}`

export async function generateMetadata({ params }: RouteParamsPromise): Promise<Metadata> {
  const { countryCode, slug } = await params
  const routeCountryAlias = normalizeRouteCountry(countryCode)
  const edition = resolveEdition(countryCode)
  const normalizedSlug = normalizeSlug(slug)

  if (!edition) {
    const baseUrl = sanitizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)
    const dynamicOgUrl = buildDynamicOgUrl(baseUrl, routeCountryAlias, normalizedSlug)
    const placeholderImage = buildPlaceholderUrl(baseUrl)

    return {
      title: "Article not found - News On Africa",
      description: "We couldn't find the requested article.",
      robots: { index: false, follow: false },
      openGraph: {
        images: [{ url: dynamicOgUrl }, { url: placeholderImage }],
      },
      twitter: {
        card: "summary_large_image",
        images: [dynamicOgUrl, placeholderImage],
      },
    }
  }

  const editionCountry = normalizeCountryCode(edition.code)
  const baseUrl = sanitizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)
  const placeholderImage = buildPlaceholderUrl(baseUrl)

  const countryPriority = buildArticleCountryPriority(editionCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)
  const article =
    resolvedArticle.status === "found"
      ? resolvedArticle.article
      : resolvedArticle.status === "temporary_error"
        ? resolvedArticle.staleArticle ?? null
        : null
  const fallbackImage = article?.featuredImage?.node?.sourceUrl || placeholderImage
  const title = stripHtml(article?.title ?? "") || "News On Africa"
  const description = stripHtml(article?.excerpt ?? "") || "Latest stories from News On Africa."
  const resolvedSourceCountry = resolvedArticle.status === "found"
    ? resolvedArticle.sourceCountry ?? editionCountry
    : resolvedArticle.status === "temporary_error"
      ? resolvedArticle.staleSourceCountry ?? editionCountry
      : editionCountry
  const targetCountry = isCountryEdition(edition)
    ? normalizeRouteCountry(resolvedSourceCountry ?? editionCountry)
    : routeCountryAlias
  const canonicalUrl = `${baseUrl}/${targetCountry}/article/${normalizedSlug}`
  const dynamicOgUrl = buildDynamicOgUrl(baseUrl, targetCountry, normalizedSlug)

  return {
    title: `${title} - News On Africa`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title,
      description,
      images: [{ url: dynamicOgUrl }, { url: fallbackImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [dynamicOgUrl, fallbackImage],
    },
  }
}

export default async function ArticlePage({ params }: RouteParamsPromise) {
  const { countryCode, slug } = await params
  const edition = resolveEdition(countryCode)

  if (!edition) {
    notFound()
  }

  const editionCountry = normalizeCountryCode(edition.code)
  const routeCountry = normalizeRouteCountry(countryCode)
  const normalizedSlug = normalizeSlug(slug)
  const countryPriority = buildArticleCountryPriority(editionCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)

  if (resolvedArticle.status === "not_found") {
    notFound()
  }

  const usingStaleContent = resolvedArticle.status === "temporary_error"
  const articleData =
    resolvedArticle.status === "found"
      ? resolvedArticle.article
      : resolvedArticle.staleArticle ?? null

  if (!articleData) {
    if (usingStaleContent) {
      throw resolvedArticle.error
    }

    notFound()
  }

  if (usingStaleContent && process.env.NODE_ENV !== "production") {
    console.warn("Serving stale article content due to temporary failure", {
      error: resolvedArticle.error,
      slug: normalizedSlug,
      countryPriority,
    })
  }

  const resolvedSourceCountry = resolvedArticle.status === "found"
    ? resolvedArticle.sourceCountry ?? editionCountry
    : resolvedArticle.staleSourceCountry ?? editionCountry

  const targetCountry = isCountryEdition(edition)
    ? normalizeRouteCountry(resolvedSourceCountry ?? editionCountry)
    : routeCountry

  if (targetCountry !== routeCountry) {
    redirect(`/${targetCountry}/article/${normalizedSlug}`)
  }

  const relatedCountry = resolvedSourceCountry ?? editionCountry
  const relatedPostId = resolveRelatedPostId(articleData)
  let relatedPosts: Awaited<ReturnType<typeof getRelatedPostsForCountry>> = []

  if (relatedPostId !== null) {
    try {
      relatedPosts = await getRelatedPostsForCountry(relatedCountry, relatedPostId, 6)
    } catch (relatedError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to load related posts for article", { relatedError, relatedCountry, relatedPostId })
      }
      relatedPosts = []
    }
  }

  return (
    <ArticleClientContent
      slug={normalizedSlug}
      countryCode={targetCountry}
      sourceCountryCode={
        resolvedArticle.status === "found"
          ? resolvedArticle.sourceCountry
          : resolvedArticle.staleSourceCountry
      }
      initialData={articleData}
      relatedPosts={relatedPosts}
    />
  )
}

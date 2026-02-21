import { Suspense } from "react"
import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"
import { draftMode } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ENV } from "@/config/env"
import { stripHtml } from "@/lib/search"
import { isCountryEdition } from "@/lib/editions"
import { getRelatedPostsForCountry } from "@/lib/wordpress/service"
import { ArticleJsonLd } from "@/components/ArticleJsonLd"

import {
  PLACEHOLDER_IMAGE_PATH,
  buildArticleCountryPriority,
  loadArticleWithFallback,
  normalizeCountryCode,
  normalizeRouteCountry,
  normalizeSlug,
  resolveEdition,
  sanitizeBaseUrl,
} from "./article-data"

import { ArticleClientContent } from "./ArticleClientContent"
import { ArticleServerFallback } from "./ArticleServerFallback"

export async function generateStaticParams() {
  return []
}

export const dynamic = "force-static"
export const dynamicParams = true
export const revalidate = 300

type RouteParams = { params: { countryCode: string; slug: string } }
type RouteParamsPromise = { params: Promise<RouteParams["params"]> }

const resolveRelatedPostId = (
  article:
    | {
      databaseId?: number | null
      id?: unknown
    }
    | null
    | undefined,
) => {
  if (typeof article?.databaseId === "number" && Number.isFinite(article.databaseId)) {
    return article.databaseId
  }

  const relayId = article?.id
  if (typeof relayId !== "string") return null

  let decodedRelayId: string
  try {
    decodedRelayId = Buffer.from(relayId, "base64").toString("utf8")
  } catch {
    return null
  }

  const decodedId = Number(decodedRelayId.split(":").pop())
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
  const { isEnabled: preview } = await draftMode()

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
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority, preview)
  const article = resolvedArticle.status === "found" ? resolvedArticle.article : null
  const fallbackImage = article?.featuredImage?.node?.sourceUrl || placeholderImage
  const isTemporaryError = resolvedArticle.status === "temporary_error"

  const title =
    stripHtml(article?.title ?? "") ||
    (isTemporaryError ? "Article temporarily unavailable" : "News On Africa")

  const description =
    stripHtml(article?.excerpt ?? "") ||
    (isTemporaryError
      ? "We hit a temporary issue loading this story. Please try again in a moment."
      : "Latest stories from News On Africa.")

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
  const { isEnabled: preview } = await draftMode()

  if (!edition) notFound()

  const editionCountry = normalizeCountryCode(edition.code)
  const routeCountry = normalizeRouteCountry(countryCode)
  const normalizedSlug = normalizeSlug(slug)
  const countryPriority = buildArticleCountryPriority(editionCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority, preview)

  if (resolvedArticle.status === "not_found") notFound()

  const isTemporaryError = resolvedArticle.status === "temporary_error"
  const articleData = resolvedArticle.status === "found" ? resolvedArticle.article : null

  if (!articleData) {
    if (isTemporaryError) {
      if (!preview && process.env.NODE_ENV === "production") {
        noStore()
      }

      const errorDigest =
        typeof (resolvedArticle.error as { digest?: unknown })?.digest === "string"
          ? (resolvedArticle.error as { digest?: string }).digest
          : undefined
      const failureCountries = resolvedArticle.failures?.map(({ country }) => country)

      return <ArticleServerFallback digest={errorDigest} failureCountries={failureCountries} />
    }

    notFound()
  }

  if (isTemporaryError && process.env.NODE_ENV !== "production") {
    console.warn("Serving stale article content due to temporary failure", {
      error: resolvedArticle.error,
      slug: normalizedSlug,
      countryPriority,
    })
  }

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
    : routeCountry

  if (targetCountry !== routeCountry) {
    redirect(`/${targetCountry}/article/${normalizedSlug}`)
  }

  const relatedCountry = resolvedSourceCountry ?? editionCountry
  const relatedPostId = resolveRelatedPostId(articleData)
  let relatedPosts: Awaited<ReturnType<typeof getRelatedPostsForCountry>> = []

  const baseUrl = sanitizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)
  const canonicalUrl = `${baseUrl}/${targetCountry}/article/${normalizedSlug}`

  if (relatedPostId !== null) {
    try {
      relatedPosts = await getRelatedPostsForCountry(relatedCountry, relatedPostId, 6)
    } catch (relatedError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to load related posts for article", {
          relatedError,
          relatedCountry,
          relatedPostId,
        })
      }
      relatedPosts = []
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <ArticleJsonLd post={articleData} url={canonicalUrl} />
      </Suspense>
      <ArticleClientContent
        slug={normalizedSlug}
        countryCode={targetCountry}
        sourceCountryCode={resolvedSourceCountry}
        initialData={articleData}
        relatedPosts={relatedPosts}
      />
    </>
  )
}
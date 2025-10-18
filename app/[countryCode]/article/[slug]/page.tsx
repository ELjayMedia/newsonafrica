import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { env } from "@/config/env"
import { stripHtml } from "@/lib/search"
import { AFRICAN_EDITION, isCountryEdition } from "@/lib/editions"
import { getRelatedPostsForCountry } from "@/lib/wordpress/posts"

import {
  PLACEHOLDER_IMAGE_PATH,
  buildArticleCountryPriority,
  loadArticleWithFallback,
  normalizeCountryCode,
  normalizeSlug,
  resolveEdition,
  sanitizeBaseUrl,
} from "./article-data"

import { ArticleClientContent } from "./ArticleClientContent"

export const dynamic = "force-dynamic"
export const revalidate = 60

type RouteParams = { params: { countryCode: string; slug: string } }

const buildDynamicOgUrl = (baseUrl: string, countryCode: string, slug: string) =>
  `${baseUrl}/${countryCode}/article/${slug}/opengraph-image`

const buildPlaceholderUrl = (baseUrl: string) => `${baseUrl}${PLACEHOLDER_IMAGE_PATH}`

export async function generateMetadata({ params }: { params: Promise<RouteParams["params"]> }): Promise<Metadata> {
  const { countryCode, slug } = await params
  const edition = resolveEdition(countryCode)
  const normalizedSlug = normalizeSlug(slug)

  if (!edition) {
    const baseUrl = sanitizeBaseUrl(env.NEXT_PUBLIC_SITE_URL)
    const dynamicOgUrl = buildDynamicOgUrl(baseUrl, normalizeCountryCode(countryCode), normalizedSlug)
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

  const normalizedCountry = edition.code.toLowerCase()
  const baseUrl = sanitizeBaseUrl(env.NEXT_PUBLIC_SITE_URL)
  const dynamicOgUrl = buildDynamicOgUrl(baseUrl, normalizedCountry, normalizedSlug)
  const placeholderImage = buildPlaceholderUrl(baseUrl)

  const countryPriority = buildArticleCountryPriority(normalizedCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)
  const article = resolvedArticle?.article ?? null
  const fallbackImage = article?.featuredImage?.node?.sourceUrl || placeholderImage
  const title = stripHtml(article?.title ?? "") || "News On Africa"
  const description = stripHtml(article?.excerpt ?? "") || "Latest stories from News On Africa."
  const canonicalUrl = `${baseUrl}/${normalizedCountry}/article/${normalizedSlug}`

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

export default async function ArticlePage({ params }: RouteParams) {
  const { countryCode, slug } = params
  const edition = resolveEdition(countryCode)

  if (!edition) {
    notFound()
  }

  const normalizedCountry = edition.code.toLowerCase()
  const normalizedSlug = normalizeSlug(slug)
  const countryPriority = buildArticleCountryPriority(normalizedCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)

  if (resolvedArticle === null) {
    notFound()
  }

  const postId = resolvedArticle.article?.id != null ? String(resolvedArticle.article.id) : null
  const relatedCountry = resolvedArticle.sourceCountry ?? normalizedCountry
  const relatedPosts =
    postId !== null ? await getRelatedPostsForCountry(relatedCountry, postId, 6) : []

  return (
    <ArticleClientContent
      slug={normalizedSlug}
      countryCode={isCountryEdition(edition) ? normalizedCountry : AFRICAN_EDITION.code}
      sourceCountryCode={resolvedArticle.sourceCountry}
      initialData={resolvedArticle.article}
      relatedPosts={relatedPosts}
    />
  )
}

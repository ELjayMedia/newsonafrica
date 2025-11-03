import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { env } from "@/config/env"
import { stripHtml } from "@/lib/search"
import { SUPPORTED_EDITIONS, isCountryEdition } from "@/lib/editions"
import { getLatestPostsForCountry, getRelatedPostsForCountry } from "@/lib/wordpress/posts"

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

export const revalidate = 60
export const dynamicParams = true

export async function generateStaticParams(): Promise<Array<{ countryCode: string; slug: string }>> {
  const editionPromises = SUPPORTED_EDITIONS.filter(isCountryEdition).map(async (edition) => {
    const { posts } = await getLatestPostsForCountry(edition.code, 50)
    const normalizedCountry = normalizeCountryCode(edition.code)

    return (
      posts
        ?.map((post) => (typeof post?.slug === "string" ? post.slug.trim() : ""))
        .filter((slug): slug is string => Boolean(slug))
        .map((slug) => ({ countryCode: normalizedCountry, slug: normalizeSlug(slug) })) ?? []
    )
  })

  const staticEntries = (await Promise.all(editionPromises)).flat()
  const seen = new Set<string>()

  return staticEntries.filter(({ countryCode, slug }) => {
    if (!slug) {
      return false
    }

    const key = `${countryCode}:${slug}`
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

type RouteParams = { params: { countryCode: string; slug: string } }
type RouteParamsPromise = { params: Promise<RouteParams["params"]> }

const buildDynamicOgUrl = (baseUrl: string, countryCode: string, slug: string) =>
  `${baseUrl}/${countryCode}/article/${slug}/opengraph-image`

const buildPlaceholderUrl = (baseUrl: string) => `${baseUrl}${PLACEHOLDER_IMAGE_PATH}`

export async function generateMetadata({ params }: RouteParamsPromise): Promise<Metadata> {
  const { countryCode, slug } = await params
  const routeCountry = normalizeCountryCode(countryCode)
  const routeCountryAlias = normalizeRouteCountry(countryCode)
  const edition = resolveEdition(countryCode)
  const normalizedSlug = normalizeSlug(slug)

  if (!edition) {
    const baseUrl = sanitizeBaseUrl(env.NEXT_PUBLIC_SITE_URL)
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
  const baseUrl = sanitizeBaseUrl(env.NEXT_PUBLIC_SITE_URL)
  const placeholderImage = buildPlaceholderUrl(baseUrl)

  const countryPriority = buildArticleCountryPriority(editionCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)
  const article = resolvedArticle?.article ?? null
  const fallbackImage = article?.featuredImage?.node?.sourceUrl || placeholderImage
  const title = stripHtml(article?.title ?? "") || "News On Africa"
  const description = stripHtml(article?.excerpt ?? "") || "Latest stories from News On Africa."
  const targetCountry = isCountryEdition(edition)
    ? normalizeRouteCountry(resolvedArticle?.sourceCountry ?? editionCountry)
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

  if (resolvedArticle === null) {
    notFound()
  }

  const targetCountry = isCountryEdition(edition)
    ? normalizeRouteCountry(resolvedArticle.sourceCountry ?? editionCountry)
    : routeCountry

  if (targetCountry !== routeCountry) {
    redirect(`/${targetCountry}/article/${normalizedSlug}`)
  }

  const postId = resolvedArticle.article?.id != null ? String(resolvedArticle.article.id) : null
  const relatedCountry = resolvedArticle.sourceCountry ?? editionCountry
  const relatedPosts =
    postId !== null ? await getRelatedPostsForCountry(relatedCountry, postId, 6) : []

  return (
    <ArticleClientContent
      slug={normalizedSlug}
      countryCode={targetCountry}
      sourceCountryCode={resolvedArticle.sourceCountry}
      initialData={resolvedArticle.article}
      relatedPosts={relatedPosts}
    />
  )
}

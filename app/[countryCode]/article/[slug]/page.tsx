import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { env } from "@/config/env"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { fetchFromWp, type WordPressPost } from "@/lib/wordpress-api"
import { wordpressQueries } from "@/lib/wordpress-queries"
import { mapWpPost } from "@/lib/utils/mapWpPost"
import { stripHtml } from "@/lib/search"
import { SUPPORTED_COUNTRIES } from "@/lib/utils/routing"

import { ArticleClientContent } from "./ArticleClientContent"

export const dynamic = "force-dynamic"
export const revalidate = 60

type RouteParams = { params: { countryCode: string; slug: string } }

type FetchResponse<T> = { data: T } | { data: T; headers: Headers } | T | null

const PLACEHOLDER_IMAGE_PATH = "/news-placeholder.png"
const SUPPORTED_COUNTRY_SET = new Set(SUPPORTED_COUNTRIES.map((code) => code.toLowerCase()))

const isSupportedCountry = (countryCode: string): boolean => SUPPORTED_COUNTRY_SET.has(countryCode.toLowerCase())

const sanitizeBaseUrl = (value: string): string => value.replace(/\/$/, "")

const resolveFetchedData = <T,>(result: FetchResponse<T[]>): T[] | null => {
  if (!result) return null

  if (Array.isArray(result)) {
    return result
  }

  if (typeof result === "object" && result !== null && "data" in result && Array.isArray(result.data)) {
    return result.data
  }

  return null
}

const looksLikeNormalizedPost = (post: unknown): post is WordPressPost => {
  if (!post || typeof post !== "object") return false

  const candidate = post as Record<string, unknown>
  return typeof candidate.title === "string"
}

async function loadArticle(countryCode: string, slug: string): Promise<WordPressPost | null> {
  try {
    const cacheTags = buildCacheTags({
      country: countryCode,
      section: "article",
      extra: [`slug:${slug}`],
    })

    const result = await fetchFromWp<unknown[]>(countryCode, wordpressQueries.postBySlug(slug), {
      tags: cacheTags,
    })

    const posts = resolveFetchedData(result)
    const rawPost = posts?.[0]

    if (!rawPost) {
      return null
    }

    if (looksLikeNormalizedPost(rawPost)) {
      return rawPost
    }

    return mapWpPost(rawPost, "rest", countryCode)
  } catch (error) {
    console.error("[v0] Failed to load article", { countryCode, slug, error })
    return null
  }
}

const buildDynamicOgUrl = (baseUrl: string, countryCode: string, slug: string) =>
  `${baseUrl}/${countryCode}/article/${slug}/opengraph-image`

const buildPlaceholderUrl = (baseUrl: string) => `${baseUrl}${PLACEHOLDER_IMAGE_PATH}`

export async function generateMetadata({ params }: { params: Promise<RouteParams["params"]> }): Promise<Metadata> {
  const { countryCode, slug } = await params
  const normalizedCountry = countryCode.toLowerCase()
  const baseUrl = sanitizeBaseUrl(env.NEXT_PUBLIC_SITE_URL)
  const dynamicOgUrl = buildDynamicOgUrl(baseUrl, normalizedCountry, slug)
  const placeholderImage = buildPlaceholderUrl(baseUrl)

  if (!isSupportedCountry(normalizedCountry)) {
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

  const article = await loadArticle(normalizedCountry, slug)
  const fallbackImage = article?.featuredImage?.node?.sourceUrl || placeholderImage
  const title = stripHtml(article?.title ?? "") || "News On Africa"
  const description = stripHtml(article?.excerpt ?? "") || "Latest stories from News On Africa."
  const canonicalUrl = `${baseUrl}/${normalizedCountry}/article/${slug}`

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
  const normalizedCountry = countryCode.toLowerCase()

  if (!isSupportedCountry(normalizedCountry)) {
    notFound()
  }

  const article = await loadArticle(normalizedCountry, slug)

  if (!article) {
    notFound()
  }

  return <ArticleClientContent slug={slug} countryCode={normalizedCountry} initialData={article} />
}

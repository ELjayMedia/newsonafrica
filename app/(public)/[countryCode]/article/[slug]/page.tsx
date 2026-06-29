import { Suspense } from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { draftMode } from "next/headers"
import { notFound } from "next/navigation"
import { MessageSquare, Gift, Share2 } from "lucide-react"

import { ENV } from "@/config/env"
import { stripHtml } from "@/lib/search"
import { ArticleJsonLd } from "@/components/ArticleJsonLd"
import { BookmarkButton } from "@/components/BookmarkButton"
import { Button } from "@/components/ui/button"
import { ArticleBody } from "@/components/article/ArticleBody"
import { ArticleHeader } from "@/components/article/ArticleHeader"
import { ArticlePageLayout } from "@/components/article/ArticlePageLayout"
import { AdSlot } from "@/components/ui/ad-slot"

import {
  PLACEHOLDER_IMAGE_PATH,
  normalizeRouteCountry,
  sanitizeBaseUrl,
} from "./article-data"

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const wordCount = text ? text.split(" ").length : 0
  return Math.max(1, Math.ceil(wordCount / 200))
}

import { ArticleComments } from "./ArticleComments"
import { ArticleServerFallback } from "./ArticleServerFallback"
import { formatArticleBodyCached } from "./article-content-formatter"
import { resolveArticle } from "./resolve-article"

export async function generateStaticParams() {
  return []
}

export const dynamic = "force-static"
export const dynamicParams = true
export const revalidate = 300

type RouteParams = { params: { countryCode: string; slug: string } }
type RouteParamsPromise = { params: Promise<RouteParams["params"]> }

const buildDynamicOgUrl = (baseUrl: string, countryCode: string, slug: string) =>
  `${baseUrl}/${countryCode}/article/${slug}/opengraph-image`

const buildPlaceholderUrl = (baseUrl: string) => `${baseUrl}${PLACEHOLDER_IMAGE_PATH}`

const buildArticleRouteUrl = (baseUrl: string, countryCode: string, slug: string) =>
  `${baseUrl}/${countryCode}/article/${slug}`

const resolveRenderedText = (value: unknown): string => {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "rendered" in value && typeof (value as { rendered?: unknown }).rendered === "string") {
    return (value as { rendered: string }).rendered
  }
  return ""
}

export async function generateMetadata({ params }: RouteParamsPromise): Promise<Metadata> {
  const { countryCode, slug } = await params
  const routeCountryAlias = normalizeRouteCountry(countryCode)
  const routeSlug = slug.toLowerCase()
  const { isEnabled: preview } = await draftMode()
  const resolved = await resolveArticle({ countryCode, slug, preview })
  const baseUrl = sanitizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)
  const requestedUrl = buildArticleRouteUrl(baseUrl, routeCountryAlias, routeSlug)
  const dynamicOgUrl = buildDynamicOgUrl(baseUrl, routeCountryAlias, routeSlug)

  if (resolved.status === "not_found" && !resolved.articleData && !resolved.resolvedSourceCountry) {
    const placeholderImage = buildPlaceholderUrl(baseUrl)

    return {
      title: "Article not found - News On Africa",
      description: "We couldn't find the requested article.",
      robots: { index: false, follow: false },
      alternates: { canonical: requestedUrl },
      openGraph: {
        url: requestedUrl,
        images: [{ url: dynamicOgUrl }, { url: placeholderImage }],
      },
      twitter: {
        card: "summary_large_image",
        images: [dynamicOgUrl, placeholderImage],
      },
    }
  }

  const placeholderImage = buildPlaceholderUrl(baseUrl)
  const article = resolved.articleData
  const fallbackImage = article?.featuredImage?.node?.sourceUrl || placeholderImage
  const isTemporaryError = resolved.status === "temporary_error"

  if (isTemporaryError) {
    console.warn("[article-page] metadata fallback used due to temporary article fetch failure", {
      error: resolved.failureMetadata?.error,
      slug: resolved.failureMetadata?.parsedSlug,
      countryPriority: resolved.failureMetadata?.countryPriority,
      preview: resolved.failureMetadata?.preview ?? preview,
    })
  }

  const title =
    stripHtml(article?.title ?? "") ||
    (isTemporaryError ? "Article temporarily unavailable" : "News On Africa")

  const description =
    stripHtml(article?.excerpt ?? "") ||
    (isTemporaryError
      ? "We hit a temporary issue loading this story. Please try again in a moment."
      : "Latest stories from News On Africa.")

  return {
    title: `${title} - News On Africa`,
    description,
    alternates: { canonical: requestedUrl },
    openGraph: {
      type: "article",
      url: requestedUrl,
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
  const routeCountry = normalizeRouteCountry(countryCode)
  const routeSlug = slug.toLowerCase()
  const { isEnabled: preview } = await draftMode()
  const resolved = await resolveArticle({ countryCode, slug, preview })

  if (resolved.status === "not_found") notFound()

  const isTemporaryError = resolved.status === "temporary_error"
  const articleData = resolved.articleData

  if (!articleData) {
    if (isTemporaryError) {
      noStore()

      console.warn("[article-page] rendering fallback due to temporary article fetch failure", {
        error: resolved.failureMetadata?.error,
        slug: resolved.failureMetadata?.parsedSlug,
        countryPriority: resolved.failureMetadata?.countryPriority,
        preview: resolved.failureMetadata?.preview ?? preview,
      })

      return (
        <ArticleServerFallback
          staleArticle={resolved.failureMetadata?.staleArticle ?? null}
          digest={resolved.failureMetadata?.errorDigest}
          failureCountries={resolved.failureMetadata?.failureCountries}
        />
      )
    }

    notFound()
  }

  if (isTemporaryError) {
    console.warn("Serving stale article content due to temporary failure", {
      error: resolved.failureMetadata?.error,
      slug: resolved.failureMetadata?.parsedSlug,
      countryPriority: resolved.failureMetadata?.countryPriority,
    })
  }

  const sourceCountry = resolved.targetCountry
  const sourceSlug = resolved.canonicalSlug

  const formattedBody = await formatArticleBodyCached({
    country: sourceCountry,
    canonicalSlug: sourceSlug,
    version: resolved.articleVersion,
    html: resolveRenderedText(articleData.content),
    preview,
  })

  const baseUrl = sanitizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)
  const requestedArticleUrl = buildArticleRouteUrl(baseUrl, routeCountry, routeSlug)
  const articleExcerpt = stripHtml(resolveRenderedText(articleData.excerpt))
  const shouldPrioritizeFeaturedImage = !articleExcerpt
  const articleTitle = stripHtml(resolveRenderedText(articleData.title)) || "Untitled article"
  const readingTime = estimateReadingTime(resolveRenderedText(articleData.content))
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${articleTitle} ${requestedArticleUrl}`)}`

  return (
    <>
      <Suspense fallback={null}>
        <ArticleJsonLd post={articleData} url={requestedArticleUrl} />
      </Suspense>
      <ArticlePageLayout>
        <div className="container mx-auto px-1 sm:px-2 md:px-4 pb-6 bg-white">
          {/* Leaderboard — above the first screen, never interrupting the lede */}
          <AdSlot format="leaderboard" className="mb-6" />
          <article className="mb-8 space-y-6">
            <ArticleHeader
              title={articleTitle}
              excerpt={articleExcerpt}
              category={articleData.categories?.nodes?.[0]?.name}
              author={
                resolveRenderedText(articleData.author?.node?.name ?? articleData.author?.name) ||
                articleData.author?.node?.name ||
                articleData.author?.name ||
                "News On Africa"
              }
              publishedDate={articleData.date}
              readingTime={readingTime}
            />

            <div className="flex items-center justify-end">
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <a href="#comments-section">
                    <MessageSquare className="mr-2 h-4 w-4" />Comments
                  </a>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/subscribe?intent=gift&article=${routeSlug}&country=${routeCountry}`}>
                    <Gift className="mr-2 h-4 w-4" />Gift article
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
                    <Share2 className="mr-2 h-4 w-4" />Share
                  </a>
                </Button>
                <BookmarkButton
                  postId={
                    typeof articleData.databaseId === "number"
                      ? String(articleData.databaseId)
                      : (articleData.id ?? routeSlug)
                  }
                  editionCode={routeCountry}
                  slug={routeSlug}
                  title={articleTitle}
                  excerpt={articleExcerpt || articleTitle}
                  featuredImage={articleData.featuredImage?.node?.sourceUrl}
                />
              </div>
            </div>

            {articleData.featuredImage?.node?.sourceUrl ? (
              <Image
                src={articleData.featuredImage.node.sourceUrl}
                alt={articleData.featuredImage.node.altText || articleTitle}
                width={1200}
                height={675}
                sizes="(min-width: 1280px) 784px, (min-width: 1024px) calc((100vw - 6rem) * 0.6667), 100vw"
                className="w-full rounded-lg"
                priority={shouldPrioritizeFeaturedImage}
              />
            ) : null}

            <ArticleBody
              html={formattedBody.sanitizedHtml}
              blocks={formattedBody.blocks}
              className="prose prose-lg max-w-none mb-8 text-sm text-black"
              // In-article unit dropped after the 3rd paragraph and onward — never inside the lede
              renderAd={() => <AdSlot format="in-content" />}
            />

            <Suspense fallback={null}>
              <ArticleComments
                postId={
                  typeof articleData.databaseId === "number"
                    ? String(articleData.databaseId)
                    : (articleData.id ?? routeSlug)
                }
                countryCode={sourceCountry}
              />
            </Suspense>

          </article>
        </div>
      </ArticlePageLayout>
    </>
  )
}

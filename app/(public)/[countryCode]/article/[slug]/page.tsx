import { Suspense } from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { draftMode } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { MessageSquare, Gift } from "lucide-react"

import { ENV } from "@/config/env"
import { stripHtml } from "@/lib/search"
import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"
import { isCountryEdition } from "@/lib/editions"
import { getRelatedPostsForCountry } from "@/lib/wordpress/service"
import { ArticleJsonLd } from "@/components/ArticleJsonLd"
import { BookmarkButton } from "@/components/BookmarkButton"
import { ShareButtons } from "@/components/ShareButtons"
import { Button } from "@/components/ui/button"
import { ArticleBody } from "@/components/article/ArticleBody"
import { ArticleHeader } from "@/components/article/ArticleHeader"
import { ArticleMostRead } from "@/components/article/ArticleMostRead"
import { ArticlePageLayout } from "@/components/article/ArticlePageLayout"
import { ArticleRelatedSection } from "@/components/article/ArticleRelatedSection"

import {
  PLACEHOLDER_IMAGE_PATH,
  buildArticleCountryPriority,
  loadArticleWithFallback,
  buildCanonicalArticleSlug,
  normalizeCountryCode,
  normalizeRouteCountry,
  parseArticleSlugParam,
  resolveEdition,
  sanitizeBaseUrl,
} from "./article-data"

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
  const edition = resolveEdition(countryCode)
  const { normalizedSlug: parsedSlug, stableId } = parseArticleSlugParam(slug)
  const { isEnabled: preview } = await draftMode()

  if (!edition) {
    const baseUrl = sanitizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)
    const dynamicOgUrl = buildDynamicOgUrl(baseUrl, routeCountryAlias, parsedSlug)
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
  const resolvedArticle = await loadArticleWithFallback(parsedSlug, countryPriority, preview, {}, stableId)
  const article = resolvedArticle.status === "found" ? resolvedArticle.article : null
  const fallbackImage = article?.featuredImage?.node?.sourceUrl || placeholderImage
  const isTemporaryError = resolvedArticle.status === "temporary_error"

  if (isTemporaryError) {
    console.warn("[article-page] metadata fallback used due to temporary article fetch failure", {
      error: resolvedArticle.error,
      slug: parsedSlug,
      countryPriority,
      preview,
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

  const canonicalSlug = buildCanonicalArticleSlug(article?.slug ?? parsedSlug, article?.databaseId)
  const canonicalUrl = `${baseUrl}/${targetCountry}/article/${canonicalSlug}`
  const dynamicOgUrl = buildDynamicOgUrl(baseUrl, targetCountry, canonicalSlug)

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
  const { normalizedSlug, stableId } = parseArticleSlugParam(slug)
  const countryPriority = buildArticleCountryPriority(editionCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority, preview, {}, stableId)

  if (resolvedArticle.status === "not_found") notFound()

  const isTemporaryError = resolvedArticle.status === "temporary_error"
  const articleData = resolvedArticle.status === "found" ? resolvedArticle.article : null

  if (!articleData) {
    if (isTemporaryError) {
      noStore()

      console.warn("[article-page] rendering fallback due to temporary article fetch failure", {
        error: resolvedArticle.error,
        slug: normalizedSlug,
        countryPriority,
        preview,
      })

      const errorDigest =
        typeof (resolvedArticle.error as { digest?: unknown })?.digest === "string"
          ? (resolvedArticle.error as { digest?: string }).digest
          : undefined
      const failureCountries = resolvedArticle.failures?.map(({ country }) => country)
      const staleArticle = resolvedArticle.staleArticle ?? null

      return (
        <ArticleServerFallback
          staleArticle={staleArticle}
          digest={errorDigest}
          failureCountries={failureCountries}
        />
      )
    }

    notFound()
  }

  if (isTemporaryError) {
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

  const canonicalSlug = buildCanonicalArticleSlug(articleData.slug ?? normalizedSlug, articleData.databaseId)

  if (targetCountry !== routeCountry || canonicalSlug !== normalizedSlug) {
    redirect(`/${targetCountry}/article/${canonicalSlug}`)
  }

  const relatedCountry = resolvedSourceCountry ?? editionCountry
  const relatedPostId = resolveRelatedPostId(articleData)
  let relatedPosts: Awaited<ReturnType<typeof getRelatedPostsForCountry>> = []

  const baseUrl = sanitizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)
  const canonicalUrl = `${baseUrl}/${targetCountry}/article/${canonicalSlug}`

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
      <ArticlePageLayout
        sidebar={
          <div className="space-y-8">
            <ArticleMostRead articles={relatedPosts.slice(0, 5)} countryCode={targetCountry} />
          </div>
        }
      >
        <div className="container mx-auto px-1 sm:px-2 md:px-4 pb-6 bg-white">
          <article className="mb-8 space-y-6">
            <ArticleHeader
              title={stripHtml(resolveRenderedText(articleData.title)) || "Untitled article"}
              excerpt={stripHtml(resolveRenderedText(articleData.excerpt))}
              category={articleData.categories?.nodes?.[0]?.name}
              author={
                resolveRenderedText(articleData.author?.node?.name ?? articleData.author?.name) ||
                articleData.author?.node?.name ||
                articleData.author?.name ||
                "News On Africa"
              }
              publishedDate={articleData.date}
            />

            <div className="flex items-center justify-between">
              <ShareButtons
                title={stripHtml(resolveRenderedText(articleData.title)) || "News On Africa"}
                description={stripHtml(resolveRenderedText(articleData.excerpt) || resolveRenderedText(articleData.title))}
                url={`/${targetCountry}/article/${canonicalSlug}`}
                variant="ghost"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full">
                  <MessageSquare className="mr-2 h-4 w-4" />Comments
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/subscribe?intent=gift&article=${canonicalSlug}&country=${targetCountry}`}>
                    <Gift className="mr-2 h-4 w-4" />Gift article
                  </Link>
                </Button>
                <BookmarkButton
                  postId={
                    articleData.id ??
                    (typeof articleData.databaseId === "number" ? String(articleData.databaseId) : normalizedSlug)
                  }
                  editionCode={targetCountry}
                  slug={canonicalSlug}
                  title={stripHtml(resolveRenderedText(articleData.title)) || "Untitled Post"}
                  excerpt={stripHtml(resolveRenderedText(articleData.excerpt) || resolveRenderedText(articleData.title))}
                  featuredImage={articleData.featuredImage?.node?.sourceUrl}
                />
              </div>
            </div>

            {articleData.featuredImage?.node?.sourceUrl ? (
              <Image
                src={articleData.featuredImage.node.sourceUrl}
                alt={articleData.featuredImage.node.altText || stripHtml(resolveRenderedText(articleData.title)) || "Article image"}
                width={1200}
                height={675}
                className="w-full rounded-lg"
                priority
              />
            ) : null}

            <ArticleBody
              html={sanitizeArticleHtml(resolveRenderedText(articleData.content)?.trim() || "<p>This article has no body content yet.</p>")}
              className="prose prose-lg max-w-none mb-8 text-sm text-black"
            />

            <ArticleRelatedSection articles={relatedPosts} countryCode={targetCountry} />
          </article>
        </div>
      </ArticlePageLayout>
    </>
  )
}

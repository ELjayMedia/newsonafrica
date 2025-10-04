import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchFromWp, type WordPressPost } from "@/lib/wordpress-api"
import { wordpressQueries } from "@/lib/wordpress-queries"
import { ArticleClientContent } from "./ArticleClientContent"
import * as log from "@/lib/log"
import { buildCacheTags } from "@/lib/cache/tag-utils"
import { ArticleJsonLd } from "@/components/ArticleJsonLd"
import type { Post as ArticlePost } from "@/lib/types"
import { env } from "@/config/env"
import { getArticleUrl } from "@/lib/utils/routing"
import { stripHtml } from "@/lib/search"
import { resolveCountryOgBadge } from "@/lib/og/country-badge"

export const runtime = "nodejs"
export const dynamic = "error"

type RouteParams = { countryCode: string; slug: string }

type ArticlePageProps = {
  params: Promise<RouteParams>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const FALLBACK_IMAGE = "/news-placeholder.png"
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

async function fetchArticle(country: string, slug: string): Promise<WordPressPost | null> {
  try {
    const cacheTags = buildCacheTags({
      country,
      section: "article",
      extra: [`post:${slug}`, `article:${slug}`],
    })

    const restPosts =
      (await fetchFromWp<WordPressPost[]>(country, wordpressQueries.postBySlug(slug), { tags: cacheTags })) || []

    return restPosts[0] ?? null
  } catch (error) {
    log.error("REST postBySlug fetch failed", { error })
    return null
  }
}

const toAbsoluteUrl = (path: string): string => {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

// This prevents preview/build flakiness when WP endpoints are slow/unreachable
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug, countryCode } = await params
  const country = (countryCode || "DEFAULT").toLowerCase()
  const badge = resolveCountryOgBadge(country)

  const canonicalUrl = toAbsoluteUrl(getArticleUrl(slug, country))
  const dynamicImageUrl = `${canonicalUrl}/opengraph-image`

  const post = await fetchArticle(country, slug)

  if (!post) {
    const fallbackDescription = `Latest headlines for the ${badge.label} edition of News On Africa.`
    const fallbackImageUrl = toAbsoluteUrl(FALLBACK_IMAGE)
    return {
      title: "Article - News On Africa",
      description: fallbackDescription,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "article",
        title: "Article - News On Africa",
        description: fallbackDescription,
        url: canonicalUrl,
        siteName: "News On Africa",
        images: [
          {
            url: dynamicImageUrl,
            width: OG_IMAGE_WIDTH,
            height: OG_IMAGE_HEIGHT,
          },
          {
            url: fallbackImageUrl,
            width: OG_IMAGE_WIDTH,
            height: OG_IMAGE_HEIGHT,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Article - News On Africa",
        description: fallbackDescription,
        images: [dynamicImageUrl, fallbackImageUrl],
      },
    }
  }

  const title = stripHtml(post.title ?? "")
  const excerpt = stripHtml(post.excerpt ?? "")
  const resolvedTitle = title ? `${title} - News On Africa` : `News On Africa - ${badge.label}`
  const description =
    excerpt || `Breaking news and in-depth reporting for the ${badge.label} edition of News On Africa.`

  const fallbackImageUrl = toAbsoluteUrl(post.featuredImage?.node?.sourceUrl ?? FALLBACK_IMAGE)
  const openGraphImages = [
    {
      url: dynamicImageUrl,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt: title ? `${title} - News On Africa` : "News On Africa article",
    },
  ]

  if (fallbackImageUrl && fallbackImageUrl !== dynamicImageUrl) {
    openGraphImages.push({
      url: fallbackImageUrl,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt: title ? `${title} featured image` : "News On Africa article image",
    })
  }

  const twitterImages = [dynamicImageUrl]
  if (fallbackImageUrl && fallbackImageUrl !== dynamicImageUrl) {
    twitterImages.push(fallbackImageUrl)
  }

  const authorName = (post.author as WordPressPost["author"])?.node?.name
  const publishedTime = post.date ?? undefined
  const modifiedTime = (post as WordPressPost & { modified?: string }).modified ?? post.date ?? undefined

  return {
    title: resolvedTitle,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      title: resolvedTitle,
      description,
      url: canonicalUrl,
      siteName: "News On Africa",
      publishedTime,
      modifiedTime,
      authors: authorName ? [authorName] : undefined,
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: twitterImages,
    },
  }
}

export default async function Page({ params }: ArticlePageProps) {
  const { slug, countryCode } = await params
  const country = (countryCode || "DEFAULT").toLowerCase()
  const post = await fetchArticle(country, slug)

  if (!post) {
    return notFound()
  }

  const canonicalUrl = `${env.NEXT_PUBLIC_SITE_URL}${getArticleUrl(slug, country)}`
  const articleUrl = `${canonicalUrl}#article-content`

  const resolvedAuthor = (post.author?.node ?? {}) as {
    name?: string
    slug?: string
    description?: string
    avatar?: { url?: string }
  }

  const resolvedId =
    post.id ?? (post.databaseId != null ? String(post.databaseId) : post.slug ?? "")

  const articlePost: ArticlePost = {
    id: resolvedId,
    title: post.title ?? "",
    excerpt: post.excerpt ?? "",
    slug: post.slug ?? "",
    date: post.date ?? "",
    modified: (post as WordPressPost & { modified?: string }).modified ?? post.date ?? "",
    featuredImage: post.featuredImage?.node
      ? {
          node: {
            sourceUrl: post.featuredImage.node.sourceUrl ?? "",
            altText: post.featuredImage.node.altText ?? "",
          },
        }
      : undefined,
    author: {
      node: {
        name: resolvedAuthor.name ?? "",
        slug: resolvedAuthor.slug ?? "",
        description: resolvedAuthor.description ?? "",
        avatar: {
          url: resolvedAuthor.avatar?.url ?? "",
        },
      },
    },
    categories: {
      nodes:
        post.categories?.nodes?.map((category) => ({
          name: category?.name ?? "",
          slug: category?.slug ?? "",
        })) ?? [],
    },
    tags: {
      nodes:
        post.tags?.nodes?.map((tag) => ({
          name: tag?.name ?? "",
          slug: tag?.slug ?? "",
        })) ?? [],
    },
    seo: undefined,
    content: post.content ?? "",
  }

  return (
    <>
      <ArticleJsonLd post={articlePost} url={articleUrl} />
      <ArticleClientContent slug={slug} countryCode={country} initialData={post} />
    </>
  )
}

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

export const runtime = "nodejs"
export const dynamic = "error"

type RouteParams = { countryCode: string; slug: string }

type ArticlePageProps = {
  params: Promise<RouteParams>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

// This prevents preview/build flakiness when WP endpoints are slow/unreachable
export async function generateStaticParams() {
  return []
}

export default async function Page({ params }: ArticlePageProps) {
  const { slug, countryCode } = await params
  const country = (countryCode || "DEFAULT").toLowerCase()
  let post: WordPressPost | null = null

  try {
    const cacheTags = buildCacheTags({
      country,
      section: "article",
      extra: [`post:${slug}`, `article:${slug}`],
    })

    const restPosts =
      (await fetchFromWp<WordPressPost[]>(country, wordpressQueries.postBySlug(slug), { tags: cacheTags })) || []
    post = restPosts[0] || null
  } catch (error) {
    log.error("REST postBySlug fetch failed", { error })
  }

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

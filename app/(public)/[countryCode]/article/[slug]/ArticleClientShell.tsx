"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Clock, Gift, MessageSquare } from "lucide-react"

import type { WordPressPost } from "@/types/wp"
import { ArticleBody } from "@/components/article/ArticleBody"
import { ArticlePageLayout } from "@/components/article/ArticlePageLayout"
import { ArticleMostRead } from "@/components/article/ArticleMostRead"
import { ArticleRelatedSection } from "@/components/article/ArticleRelatedSection"
import { ShareButtons } from "@/components/ShareButtons"
import { BookmarkButton } from "@/components/BookmarkButton"
import { Button } from "@/components/ui/button"
import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"
import { transformWordPressEmbeds } from "@/lib/utils/wordpressEmbeds"
import { stripHtml } from "@/lib/search"
import { rewriteLegacyLinks } from "@/lib/utils/routing"
import { formatDate } from "@/lib/utils/date"

import { fetchArticleWithFallbackAction } from "./actions"

interface ArticleClientShellProps {
  slug: string
  countryCode: string
  sourceCountryCode?: string
  initialData: any
  relatedPosts: WordPressPost[]
  fetchArticleWithFallback?: typeof fetchArticleWithFallbackAction
}

const resolveRenderedText = (value: unknown): string => {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "rendered" in value && typeof (value as any).rendered === "string") {
    return (value as any).rendered
  }
  return ""
}

export function ArticleClientShell({
  slug,
  countryCode,
  initialData,
  relatedPosts,
}: ArticleClientShellProps) {
  const [articleData, setArticleData] = useState<WordPressPost | null>(initialData ?? null)
  const [currentRelatedPosts, setCurrentRelatedPosts] = useState<WordPressPost[]>(relatedPosts)

  useEffect(() => {
    setArticleData(initialData ?? null)
    setCurrentRelatedPosts(relatedPosts)
  }, [initialData, relatedPosts])

  const title = resolveRenderedText(articleData?.title)
  const excerpt = resolveRenderedText(articleData?.excerpt)
  const content = resolveRenderedText(articleData?.content)
  const publishedDate = articleData?.date
  const authorName =
    resolveRenderedText(articleData?.author?.node?.name ?? articleData?.author?.name) ||
    articleData?.author?.node?.name ||
    articleData?.author?.name ||
    "News On Africa"
  const authorSlug = articleData?.author?.node?.slug || articleData?.author?.slug

  const heroImage = articleData?.featuredImage?.node?.sourceUrl
  const heroAlt = articleData?.featuredImage?.node?.altText || stripHtml(title) || "Article image"

  const sanitizedHtml = useMemo(() => {
    const resolvedContent = content?.trim() ? content : "<p>This article has no body content yet.</p>"
    return transformWordPressEmbeds(sanitizeArticleHtml(rewriteLegacyLinks(resolvedContent, countryCode)))
  }, [content, countryCode])

  const category = articleData?.categories?.nodes?.[0]
  const shareTitle = stripHtml(title) || "News On Africa"
  const shareDescription = stripHtml(excerpt || title)
  const shareUrl = `/${countryCode}/article/${slug}`

  const bookmarkPostId = articleData?.id ?? (typeof articleData?.databaseId === "number" ? String(articleData.databaseId) : slug)

  if (!articleData) {
    return <div className="container mx-auto px-4 py-8">Loading article...</div>
  }

  return (
    <ArticlePageLayout
      sidebar={
        <div className="space-y-8">
          <ArticleMostRead articles={currentRelatedPosts.slice(0, 5)} countryCode={countryCode} />
        </div>
      }
    >
      <div className="container mx-auto px-1 sm:px-2 md:px-4 pb-6 bg-white">
        <article className="mb-8">
          <div className="flex justify-between items-center mb-4 text-sm">
            <div className="flex items-center text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              <time dateTime={publishedDate}>{publishedDate ? formatDate(publishedDate, false) : "Unknown date"}</time>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">Share</span>
              <ShareButtons title={shareTitle} url={shareUrl} description={shareDescription} variant="ghost" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{stripHtml(title) || "Untitled article"}</h1>

          <div className="flex items-center justify-between mb-4 md:mb-3">
            <div className="flex flex-col">
              {authorSlug ? (
                <Link href={`/author/${authorSlug}`} className="font-medium hover:underline text-sm md:text-base">
                  {authorName}
                </Link>
              ) : (
                <p className="font-medium text-sm md:text-base">{authorName}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1 md:gap-2">
              <Button variant="outline" className="rounded-full flex items-center gap-1 md:gap-2 bg-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2">
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Comments</span>
              </Button>
              <Button variant="outline" className="rounded-full flex items-center gap-1 md:gap-2 bg-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2">
                <Gift className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Gift article</span>
              </Button>
              <BookmarkButton
                postId={bookmarkPostId}
                editionCode={countryCode}
                slug={slug}
                title={shareTitle || "Untitled Post"}
                excerpt={shareDescription}
                featuredImage={heroImage}
              />
            </div>
          </div>

          {heroImage && (
            <div className="mb-6">
              <Image
                src={heroImage}
                alt={heroAlt}
                width={1200}
                height={675}
                className="w-full rounded-lg"
                priority
              />
            </div>
          )}

          <ArticleBody html={sanitizedHtml} className="prose prose-lg max-w-none mb-8 text-sm text-black" />

          {category?.slug && category?.name && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Link
                href={`/${countryCode}/category/${category.slug}`}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
              >
                {category.name}
              </Link>
            </div>
          )}

          <div className="flex items-center justify-center py-6 border-t border-gray-200 mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">Found this article helpful? Share it with others!</p>
              <ShareButtons title={shareTitle} url={shareUrl} description={shareDescription} variant="outline" />
            </div>
          </div>

          {currentRelatedPosts.length > 0 && <ArticleRelatedSection articles={currentRelatedPosts} countryCode={countryCode} />}
        </article>
      </div>
    </ArticlePageLayout>
  )
}

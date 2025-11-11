import Link from "next/link"

import { ArticleCard } from "@/components/ArticleCard"
import { cn } from "@/lib/utils"
import { getCategoryUrl } from "@/lib/utils/routing"
import { sanitizeExcerpt } from "@/lib/utils/text/sanitizeExcerpt"
import type { WordPressCategory, WordPressPost } from "@/types/wp"

export interface NewsGridPost {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  type?: string
  country?: string
  featuredImage?: {
    node?: {
      sourceUrl?: string
      altText?: string
    }
  }
}

type AdaptedNewsPost = WordPressPost & { country?: string }

function normalizeCategory(type?: string): WordPressCategory | undefined {
  if (!type) return undefined

  const trimmed = type.trim()
  if (!trimmed) return undefined

  return {
    name: trimmed,
    slug: trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, ""),
  }
}

function createArticleKey(article: AdaptedNewsPost, fallback: string) {
  return article.id ?? article.slug ?? fallback
}

function mapNewsGridPostToArticleCard(post: NewsGridPost): AdaptedNewsPost {
  const sanitizedExcerpt = sanitizeExcerpt(post.excerpt)
  const imageUrl = post.featuredImage?.node?.sourceUrl?.trim()
  const normalizedCountry = post.country?.toLowerCase()
  const category = normalizeCategory(post.type)

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: sanitizedExcerpt || undefined,
    date: post.date,
    featuredImage: imageUrl
      ? {
          node: {
            sourceUrl: imageUrl,
            altText: post.featuredImage?.node?.altText,
          },
        }
      : undefined,
    categories: category ? { nodes: [category] } : undefined,
    country: normalizedCountry,
  }
}

interface SportCategorySectionProps {
  sportCategoryPosts: NewsGridPost[]
}

export function SportCategorySection({ sportCategoryPosts }: SportCategorySectionProps) {
  if (!sportCategoryPosts.length) {
    return null
  }

  const [mainPost, ...secondaryPosts] = sportCategoryPosts
  const mainArticle = mainPost ? mapNewsGridPostToArticleCard(mainPost) : undefined
  const secondaryArticles = secondaryPosts.slice(0, 3).map(mapNewsGridPostToArticleCard)

  return (
    <>
      <div className="md:col-span-2 flex items-center mb-2 md:mb-3">
        <h2 className="text-base md:text-lg font-bold text-blue-600">Sports News</h2>
        <Link href={getCategoryUrl("sport")} className="ml-auto text-xs md:text-sm text-blue-500 hover:underline">
          View all
        </Link>
      </div>

      {mainArticle && (
        <div className="md:col-span-1">
          <ArticleCard article={mainArticle} layout="featured" className="h-full" priority />
        </div>
      )}

      <div className="space-y-2 md:space-y-3 md:grid md:grid-cols-1 md:gap-3">
        {secondaryArticles.map((article, index) => (
          <ArticleCard
            key={createArticleKey(article, `sport-secondary-${index}`)}
            article={article}
            layout="compact"
            className="h-full"
          />
        ))}
      </div>
    </>
  )
}

interface RegularCategorySectionProps {
  mainPost: NewsGridPost | undefined
  secondaryPosts: NewsGridPost[]
}

export function RegularCategorySection({ mainPost, secondaryPosts }: RegularCategorySectionProps) {
  if (!mainPost) return null

  const mainArticle = mapNewsGridPostToArticleCard(mainPost)
  const secondaryArticles = secondaryPosts.map(mapNewsGridPostToArticleCard)

  return (
    <>
      <ArticleCard article={mainArticle} layout="standard" className="h-full" priority />

      <div className="md:grid md:grid-cols-1 md:gap-3 md:space-y-[9px]">
        {secondaryArticles.map((article, index) => (
          <ArticleCard
            key={createArticleKey(article, `regular-secondary-${index}`)}
            article={article}
            layout="compact"
            className="h-full"
          />
        ))}
      </div>
    </>
  )
}

interface AuthorNewsListProps {
  posts: NewsGridPost[]
  className?: string
}

export function AuthorNewsList({ posts, className }: AuthorNewsListProps) {
  if (!posts.length) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {posts.map((post, index) => {
        const article = mapNewsGridPostToArticleCard(post)

        return (
          <ArticleCard
            key={createArticleKey(article, `author-${index}`)}
            article={article}
            layout="compact"
            className="h-full"
          />
        )
      })}
    </div>
  )
}

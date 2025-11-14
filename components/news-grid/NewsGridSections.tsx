import Link from "next/link"

import { ArticleCard } from "@/components/ArticleCard"
import { cn } from "@/lib/utils"
import { getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import { sanitizeExcerpt } from "@/lib/utils/text/sanitizeExcerpt"

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

export interface BlurPlaceholders {
  main: string
  secondary: string[]
}

interface SportCategorySectionProps {
  sportCategoryPosts: NewsGridPost[]
  blurURLs: BlurPlaceholders
}

export function SportCategorySection({ sportCategoryPosts, blurURLs }: SportCategorySectionProps) {
  if (!sportCategoryPosts.length) {
    return null
  }

  const [mainPost, ...secondaryPosts] = sportCategoryPosts
  const sanitizedMainExcerpt = sanitizeExcerpt(mainPost?.excerpt)

  return (
    <>
      <div className="mb-2 flex items-center md:col-span-2 md:mb-3">
        <h2 className="text-base font-bold text-blue-600 md:text-lg">Sports News</h2>
        <Link href={getCategoryUrl("sport")} className="ml-auto text-xs text-blue-500 hover:underline md:text-sm">
          View all
        </Link>
      </div>

      <ArticleCard
        href={getArticleUrl(mainPost?.slug ?? "", mainPost?.country)}
        headline={mainPost?.title ?? ""}
        excerpt={sanitizedMainExcerpt}
        timestamp={mainPost?.date}
        categoryTag={mainPost?.type ?? "Sports"}
        imageUrl={mainPost?.featuredImage?.node?.sourceUrl}
        imageAlt={mainPost?.featuredImage?.node?.altText || mainPost?.title}
        imageBlurDataURL={blurURLs.main}
        layout="vertical"
        className="md:col-span-1"
        articleClassName="bg-white dark:bg-slate-900"
        contentClassName="gap-3 p-3 md:p-4"
        headlineClassName="text-base font-bold md:text-lg"
        excerptClassName="text-xs font-light md:text-sm"
      />

      <div className="space-y-2 md:grid md:grid-cols-1 md:gap-3 md:space-y-0">
        {secondaryPosts.slice(0, 3).map((post, index) => (
          <ArticleCard
            key={post.id}
            href={getArticleUrl(post.slug, post.country)}
            headline={post.title}
            timestamp={post.date}
            imageUrl={post.featuredImage?.node?.sourceUrl}
            imageAlt={post.featuredImage?.node?.altText || post.title}
            imageBlurDataURL={blurURLs.secondary[index]}
            layout="horizontal"
            showExcerpt={false}
            articleClassName="rounded-xl bg-white dark:bg-slate-900"
            contentClassName="p-2 md:p-3"
            mediaClassName="h-[70px] w-[70px] flex-shrink-0 sm:h-[84px] sm:w-[84px]"
            headlineClassName="text-sm font-semibold md:text-base"
          />
        ))}
      </div>
    </>
  )
}

interface RegularCategorySectionProps {
  mainPost: NewsGridPost | undefined
  secondaryPosts: NewsGridPost[]
  blurURLs: BlurPlaceholders
}

export function RegularCategorySection({ mainPost, secondaryPosts, blurURLs }: RegularCategorySectionProps) {
  if (!mainPost) return null

  const sanitizedMainExcerpt = sanitizeExcerpt(mainPost.excerpt)

  return (
    <>
      <ArticleCard
        href={getArticleUrl(mainPost.slug ?? "", mainPost.country)}
        headline={mainPost.title}
        excerpt={sanitizedMainExcerpt}
        timestamp={mainPost.date}
        categoryTag={mainPost.type}
        imageUrl={mainPost.featuredImage?.node?.sourceUrl}
        imageAlt={mainPost.featuredImage?.node?.altText || mainPost.title}
        imageBlurDataURL={blurURLs.main}
        layout="vertical"
        articleClassName="rounded-xl bg-white shadow-sm dark:bg-slate-900"
        contentClassName="gap-3 p-3 md:p-4"
        headlineClassName="text-base font-bold md:text-lg"
        excerptClassName="text-xs font-light md:text-sm"
      />

      <div className="md:grid md:grid-cols-1 md:gap-3 md:space-y-[9px] md:space-y-0">
        {secondaryPosts.map((post, index) => (
          <ArticleCard
            key={post.id}
            href={getArticleUrl(post.slug, post.country)}
            headline={post.title}
            timestamp={post.date}
            imageUrl={post.featuredImage?.node?.sourceUrl}
            imageAlt={post.featuredImage?.node?.altText || post.title}
            imageBlurDataURL={blurURLs.secondary[index]}
            layout="horizontal"
            showExcerpt={false}
            articleClassName="min-h-[90px] rounded-xl border border-border/60 bg-white shadow-sm dark:bg-slate-900 md:min-h-[100px]"
            contentClassName="p-2 md:p-3"
            mediaClassName="h-20 w-20 flex-shrink-0 rounded-lg md:h-[85px] md:w-[85px]"
            headlineClassName="text-xs font-bold leading-[1.15rem] md:text-sm"
          />
        ))}
      </div>
    </>
  )
}

interface AuthorNewsListProps {
  posts: NewsGridPost[]
  blurPlaceholder: string
  className?: string
}

export function AuthorNewsList({ posts, blurPlaceholder, className }: AuthorNewsListProps) {
  if (!posts.length) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {posts.map((post) => {
        const sanitizedExcerpt = sanitizeExcerpt(post.excerpt)

        return (
          <ArticleCard
            key={post.id}
            href={getArticleUrl(post.slug, post.country)}
            headline={post.title}
            excerpt={sanitizedExcerpt}
            timestamp={post.date}
            imageUrl={post.featuredImage?.node?.sourceUrl}
            imageAlt={post.featuredImage?.node?.altText || post.title}
            imageBlurDataURL={blurPlaceholder}
            layout="horizontal"
            articleClassName="rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900"
            contentClassName="p-3 sm:p-4"
            mediaClassName="h-48 w-full flex-shrink-0 sm:h-auto sm:w-1/3"
            headlineClassName="text-base font-semibold md:text-lg"
            excerptClassName="text-sm md:text-base"
          />
        )
      })}
    </div>
  )
}

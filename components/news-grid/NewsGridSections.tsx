import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"

import { cn, formatDate, motionSafe } from "@/lib/utils"
import { getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"

export interface NewsGridPost {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  type?: string
  country?: string
  featuredImage?: {
    node: {
      sourceUrl: string
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

  return (
    <>
      <div className="md:col-span-2 flex items-center mb-2 md:mb-3">
        <h2 className="text-base md:text-lg font-bold text-blue-600">Sports News</h2>
        <Link href={getCategoryUrl("sport")} className="ml-auto text-xs md:text-sm text-blue-500 hover:underline">
          View all
        </Link>
      </div>

      <Link
        href={getArticleUrl(mainPost?.slug ?? "", mainPost?.country)}
        className={cn(
          "md:col-span-1 group block bg-white rounded-lg overflow-hidden transition-all duration-200",
          motionSafe.transition,
        )}
      >
        {mainPost?.featuredImage && (
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Image
              src={mainPost.featuredImage.node.sourceUrl || "/placeholder.svg"}
              alt={mainPost.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={cn(
                "object-cover rounded-md transition-transform duration-300 group-hover:scale-105",
                motionSafe.transform,
              )}
              placeholder="blur"
              blurDataURL={blurURLs.main}
            />
          </div>
        )}
        <div className="p-2 md:p-3">
          <h2
            className={cn(
              "text-sm md:text-base font-bold mb-1 md:mb-2 group-hover:text-blue-600 transition-colors duration-200",
              motionSafe.transition,
            )}
          >
            {mainPost?.title}
          </h2>
          <div className="text-gray-600 text-xs md:text-sm font-light mb-1 md:mb-2 line-clamp-2">{mainPost?.excerpt}</div>
          <div className="flex items-center text-gray-500 text-xs">
            <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
            <time dateTime={mainPost?.date}>{formatDate(mainPost?.date)}</time>
          </div>
        </div>
      </Link>

      <div className="space-y-2 md:space-y-3 md:grid md:grid-cols-1 md:gap-3">
        {secondaryPosts.slice(0, 3).map((post, index) => (
          <Link
            key={post.id}
            href={getArticleUrl(post.slug, post.country)}
            className={cn(
              "flex gap-2 md:gap-3 items-start bg-white p-2 md:p-3 rounded-lg transition-all duration-200 group",
              motionSafe.transition,
            )}
          >
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <h3
                className={cn(
                  "text-sm md:text-base font-bold mb-1 md:mb-2 group-hover:text-blue-600 transition-colors duration-200",
                  motionSafe.transition,
                )}
              >
                {post.title}
              </h3>
              <div className="flex items-center text-gray-500 text-xs">
                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                <time dateTime={post.date} title={formatDate(post.date)}>
                  {formatDate(post.date)}
                </time>
              </div>
            </div>
            {post.featuredImage && (
              <div className="relative w-[70px] h-[70px] sm:w-[84px] sm:h-[84px] flex-shrink-0 overflow-hidden rounded-md">
                <Image
                  src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 70px, 84px"
                  className={cn(
                    "object-cover transition-transform duration-300 group-hover:scale-105",
                    motionSafe.transform,
                  )}
                  placeholder="blur"
                  blurDataURL={blurURLs.secondary[index]}
                />
              </div>
            )}
          </Link>
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

  return (
    <>
      <Link
        href={getArticleUrl(mainPost.slug ?? "", mainPost.country)}
        className={cn(
          "md:col-span-1 group block bg-white rounded-lg overflow-hidden transition-all duration-200",
          motionSafe.transition,
        )}
      >
        {mainPost.featuredImage && (
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Image
              src={mainPost.featuredImage.node.sourceUrl || "/placeholder.svg"}
              alt={mainPost.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={cn(
                "object-cover rounded-md transition-transform duration-300 group-hover:scale-105",
                motionSafe.transform,
              )}
              placeholder="blur"
              blurDataURL={blurURLs.main}
            />
          </div>
        )}
        <div className="p-2 md:p-3">
          <h2
            className={cn(
              "text-sm md:text-base font-bold mb-1 md:mb-2 group-hover:text-blue-600 transition-colors duration-200",
              motionSafe.transition,
            )}
          >
            {mainPost.title}
          </h2>
          <div className="text-gray-600 text-xs md:text-sm font-light mb-1 md:mb-2 line-clamp-2">{mainPost.excerpt}</div>
          <div className="flex items-center text-gray-500 text-xs">
            <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
            <time dateTime={mainPost.date}>{formatDate(mainPost.date)}</time>
          </div>
        </div>
      </Link>

      <div className="space-y-2 md:space-y-3 md:grid md:grid-cols-1 md:gap-3">
        {secondaryPosts.map((post, index) => (
          <Link
            key={post.id}
            href={getArticleUrl(post.slug, post.country)}
            className={cn(
              "flex gap-3 items-start bg-white p-2 md:p-3 rounded-lg transition-all duration-200 group min-h-[90px] md:min-h-[100px]",
              motionSafe.transition,
            )}
          >
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h3
                  className={cn(
                    "text-xs md:text-sm font-bold mb-1 md:mb-2 group-hover:text-blue-600 transition-colors duration-200 leading-4",
                    motionSafe.transition,
                  )}
                >
                  {post.title}
                </h3>
              </div>
              <div className="flex items-center text-gray-500 text-xs">
                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                <time dateTime={post.date} title={formatDate(post.date)}>
                  {formatDate(post.date)}
                </time>
              </div>
            </div>
            {post.featuredImage && (
              <div className="relative w-20 h-16 md:w-[85px] md:h-[85px] flex-shrink-0 overflow-hidden rounded-md">
                <Image
                  src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 80px, 85px"
                  className={cn(
                    "object-cover transition-transform duration-300 group-hover:scale-105",
                    motionSafe.transform,
                  )}
                  placeholder="blur"
                  blurDataURL={blurURLs.secondary[index]}
                />
              </div>
            )}
          </Link>
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
      {posts.map((post) => (
        <Link
          key={post.id}
          href={getArticleUrl(post.slug, post.country)}
          className={cn(
            "flex flex-col sm:flex-row gap-3 bg-white rounded-lg transition-all duration-200 overflow-hidden group",
            motionSafe.transition,
          )}
        >
          {post.featuredImage && (
            <div className="relative h-48 sm:h-auto sm:w-1/3 overflow-hidden">
              <Image
                src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={cn(
                  "object-cover transition-transform duration-300 group-hover:scale-105",
                  motionSafe.transform,
                )}
                placeholder="blur"
                blurDataURL={blurPlaceholder}
              />
            </div>
          )}
          <div className="p-2 md:p-3 sm:w-2/3 flex flex-col justify-between">
            <div>
              <h2
                className={cn(
                  "text-sm md:text-base font-bold mb-1 md:mb-2 group-hover:text-blue-600 transition-colors duration-200",
                  motionSafe.transition,
                )}
              >
                {post.title}
              </h2>
              <div className="text-gray-600 text-sm mb-3 line-clamp-3">{post.excerpt}</div>
            </div>
            <div className="flex items-center text-gray-500 text-xs">
              <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

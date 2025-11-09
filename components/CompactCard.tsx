import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo } from "react"
import { formatDistanceToNow } from "date-fns/formatDistanceToNow"
import { getArticleUrl } from "@/lib/utils/routing"
import { sanitizeExcerpt } from "@/utils/text/sanitizeExcerpt"

interface CompactCardProps {
  post: {
    id: string
    title: string
    excerpt?: string
    slug: string
    featuredImage?:
      | {
          node: {
            sourceUrl: string
          }
        }
      | {
          sourceUrl: string
        }
    date: string
    author?: {
      node: {
        name: string
      }
    }
    categories?: {
      nodes: Array<{
        name: string
        slug: string
      }>
    }
  }
  layout?: "horizontal" | "vertical" | "minimal"
  showExcerpt?: boolean
  className?: string
}

export const CompactCard = memo(function CompactCard({
  post,
  layout = "horizontal",
  showExcerpt = false,
  className = "",
}: CompactCardProps) {
  const formattedDate = formatDistanceToNow(new Date(post.date), {
    addSuffix: true,
  })

  let imageUrl = "/placeholder.svg"
  if (post.featuredImage) {
    if ("sourceUrl" in post.featuredImage) {
      imageUrl = post.featuredImage.sourceUrl
    } else if ("node" in post.featuredImage) {
      imageUrl = post.featuredImage.node.sourceUrl
    }
  }

  const category = post.categories?.nodes?.[0]
  const sanitizedExcerpt = sanitizeExcerpt(post.excerpt)

  if (layout === "minimal") {
    return (
      <Link href={getArticleUrl(post.slug)} className={`block ${className}`}>
        <article className="py-2 border-b border-gray-100 last:border-b-0">
          <div className="flex gap-2">
            <div className="w-16 h-12 flex-shrink-0 relative rounded overflow-hidden">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={post.title}
                fill
                className="object-cover"
                sizes="64px"
                loading="lazy"
                quality={75}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium line-clamp-2 leading-tight mb-1">{post.title}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formattedDate}</span>
                {category && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{category.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  if (layout === "vertical") {
    return (
      <Link href={getArticleUrl(post.slug)} className={`block ${className}`}>
        <article className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="relative h-32 overflow-hidden">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-105"
              sizes="(max-width: 640px) 100vw, 240px"
              loading="lazy"
              quality={80}
            />
            {category && (
              <div className="absolute top-1 left-1">
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">{category.name}</span>
              </div>
            )}
          </div>
          <div className="p-2">
            <h3 className="font-semibold text-sm line-clamp-2 mb-1 leading-tight">{post.title}</h3>
            {showExcerpt && sanitizedExcerpt && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-1">{sanitizedExcerpt}</p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
              {post.author && <span className="truncate max-w-20">{post.author.node.name}</span>}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // Horizontal layout (default)
  return (
    <Link href={getArticleUrl(post.slug)} className={`block ${className}`}>
      <article className="flex gap-2 bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow p-2">
        <div className="w-20 h-16 flex-shrink-0 relative rounded overflow-hidden">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover"
            sizes="80px"
            loading="lazy"
            quality={75}
          />
        </div>
        <div className="flex-1 min-w-0">
          {category && <span className="text-xs text-blue-600 font-medium">{category.name}</span>}
          <h3 className="font-semibold text-sm line-clamp-2 mb-1 leading-tight">{post.title}</h3>
          {showExcerpt && sanitizedExcerpt && (
            <p className="text-xs text-gray-600 line-clamp-1 mb-1">{sanitizedExcerpt}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{formattedDate}</span>
            {post.author && (
              <>
                <span>•</span>
                <span className="truncate">{post.author.node.name}</span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
})

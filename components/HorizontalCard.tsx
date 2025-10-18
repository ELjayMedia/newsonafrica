import Link from "next/link"
import Image from "next/image"
import formatDistanceToNow from "date-fns/formatDistanceToNow"
import { getArticleUrl } from "@/lib/utils/routing"
import { sanitizeExcerpt } from "@/utils/text/sanitizeExcerpt"

interface HorizontalCardProps {
  post: {
    id: string
    title: string
    excerpt?: string
    slug: string
    featuredImage?: {
      node: {
        sourceUrl: string
      }
    }
    date: string
    author?: {
      node: {
        name: string
      }
    }
  }
  className?: string
}

export function HorizontalCard({ post, className = "" }: HorizontalCardProps) {
  const formattedDate = post.date ? formatDistanceToNow(new Date(post.date), { addSuffix: true }) : "Recently"
  const sanitizedExcerpt = sanitizeExcerpt(post.excerpt)

  return (
    <Link href={getArticleUrl(post.slug)} className={`block ${className}`}>
      <div className="flex flex-col sm:flex-row h-full overflow-hidden rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        {/* Image container - left side */}
        <div className="sm:w-1/3 h-40 sm:h-auto relative">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-300 text-sm">No image</span>
            </div>
          )}
        </div>

        {/* Content container - right side */}
        <div className="sm:w-2/3 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900">{post.title}</h3>
            {sanitizedExcerpt && (
              <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{sanitizedExcerpt}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-300">{formattedDate}</span>
            {post.author && (
              <span className="text-sm text-gray-500 dark:text-gray-300">by {post.author.node.name}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

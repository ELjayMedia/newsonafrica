import Image from "next/image"
import Link from "next/link"
import { Calendar } from "lucide-react"

interface Post {
  id: string
  title: string
  slug: string
  date: string
  excerpt?: string
  featuredImage?: {
    node: {
      sourceUrl: string
    }
  }
}

interface HorizontalCardProps {
  post: Post
  showExcerpt?: boolean
}

export function HorizontalCard({ post, showExcerpt = false }: HorizontalCardProps) {
  if (!post) {
    return null
  }

  return (
    <article className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <Link href={`/post/${post.slug}`} className="flex flex-col sm:flex-row h-full" aria-label={post.title}>
        <div className="relative w-full sm:w-1/3 h-40 sm:h-auto flex-shrink-0">
          <Image
            src={post.featuredImage?.node?.sourceUrl || "/placeholder.svg?height=300&width=400&query=news article"}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {post.title}
          </h3>

          {showExcerpt && post.excerpt && (
            <div
              className="text-gray-600 text-sm mb-3 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: post.excerpt }}
            />
          )}

          <div className="flex items-center text-xs text-gray-500 mt-auto">
            <Calendar className="w-3 h-3 mr-1" />
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          </div>
        </div>
      </Link>
    </article>
  )
}

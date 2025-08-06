import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { PostCard } from "./PostCard"
import { formatPostDate } from "@/lib/date"


interface HorizontalCardProps {
  post: {
    id: string
    title: string
    excerpt: string
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
  allowHtml?: boolean
}

export function HorizontalCard({ post, className = "", allowHtml = false }: HorizontalCardProps) {
  const formattedDate = post.date ? formatPostDate(post.date) : "Recently"

  const meta = (
    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-300">
      <span>{formattedDate}</span>
      {post.author && <span>by {post.author.node.name}</span>}
    </div>
  )

  const image = post.featuredImage ? (
    <Image
      src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
      alt={post.title}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  ) : (
    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
      <span className="text-gray-400 dark:text-gray-500 text-sm">No image</span>
    </div>
  )

  return (
    <Link href={`/post/${post.slug}`} className={cn("block", className)}>
      <PostCard
        image={image}
        title={post.title}
        excerpt={
          <p className="text-gray-600 dark:text-gray-400">
            {allowHtml ? <span dangerouslySetInnerHTML={{ __html: post.excerpt }} /> : post.excerpt}
          </p>
        }
        meta={meta}
        className="flex flex-col sm:flex-row h-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        imageClassName="sm:w-1/3 h-40 sm:h-auto relative"
        contentClassName="sm:w-2/3 p-4 sm:p-5"
      />
    </Link>
  )
}

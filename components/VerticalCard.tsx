import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { memo } from "react"
import { generateBlurDataURL } from "@/utils/lazy-load"
import { getArticleUrl } from "@/lib/utils/routing"
import { cn, motionSafe } from "@/lib/utils"

interface VerticalCardProps {
  post: {
    title: string
    slug: string
    date: string
    type?: string
    featuredImage?:
      | {
          sourceUrl: string
        }
      | {
          node: {
            sourceUrl: string
          }
        }
  }
  className?: string
}

export const VerticalCard = memo(function VerticalCard({ post, className = "" }: VerticalCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
  })

  const blurDataURL = generateBlurDataURL(300, 200)

  const getImageUrl = () => {
    if (!post.featuredImage) return "/placeholder.svg"

    if ("sourceUrl" in post.featuredImage) {
      return post.featuredImage.sourceUrl
    }

    if ("node" in post.featuredImage) {
      return post.featuredImage.node.sourceUrl
    }

    return "/placeholder.svg"
  }

  const imageUrl = getImageUrl()

  return (
    <Link href={getArticleUrl(post.slug)} className={cn("group block h-full", className)}>
      <article
        className={cn(
          "flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200",
          motionSafe.transition,
        )}
      >
        {post.featuredImage && (
          <div className="relative h-32 overflow-hidden">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={post.title}
              fill
              className={cn(
                "transition-transform duration-300 group-hover:scale-105 object-cover",
                motionSafe.transform,
              )}
              sizes="(max-width: 640px) 100vw, 240px"
              placeholder="blur"
              blurDataURL={blurDataURL}
            />
          </div>
        )}
        <div className="p-3 flex-1 flex flex-col">
          {post.type && <div className="text-sm font-bold text-red-600 mb-1">{post.type}</div>}
          <h3
            className={cn(
              "font-bold text-sm leading-tight group-hover:text-blue-600 transition-colors duration-200",
              motionSafe.transition,
            )}
          >
            {post.title}
          </h3>
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-auto pt-2">
            <Clock className="h-3 w-3" />
            <time>{formattedDate}</time>
          </div>
        </div>
      </article>
    </Link>
  )
})

import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"

import { cn, motionSafe } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazy-load"
import { getArticleUrl } from "@/lib/utils/routing"

interface SecondaryStoryPost {
  id: string
  title: string
  slug: string
  date: string
  country?: string
  featuredImage?: {
    node?: {
      sourceUrl?: string
    }
  }
}

export interface SecondaryStoriesProps {
  posts: SecondaryStoryPost[]
  layout?: "horizontal" | "vertical"
}

const formatDate = (date: string) => {
  const now = new Date()
  const postDate = new Date(date)
  const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60))

  if (Number.isNaN(diffInHours)) {
    return ""
  }

  return diffInHours < 24
    ? `${diffInHours}h ago`
    : postDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function SecondaryStories({ posts, layout = "vertical" }: SecondaryStoriesProps) {
  if (!posts?.length) return null

  const formattedPosts = posts.slice(0, 3).map((post) => ({
    ...post,
    formattedDate: formatDate(post.date),
    blurDataURL: generateBlurDataURL(400, 225),
  }))

  return (
    <div
      className={`grid md:gap-1.5 ${layout === "horizontal" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2 md:grid-cols-2 lg:grid-cols-3"}`}
    >
      {formattedPosts.map((post, index) => {
        const imageUrl = post.featuredImage?.node?.sourceUrl || "/placeholder.svg"
        const isPriority = index < 2

        return (
          <Link
            key={post.id}
            href={getArticleUrl(post.slug, post.country)}
            className={cn(
              "flex flex-row md:flex-col items-center md:items-start group bg-gray-50 rounded-lg overflow-hidden transition-all duration-200",
              motionSafe.transition,
            )}
          >
            {post.featuredImage && (
              <div
                className={`relative ${layout === "horizontal" ? "w-24 md:w-full h-20 md:h-auto md:aspect-video" : "w-full aspect-video"} overflow-hidden`}
              >
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={post.title}
                  fill
                  className={cn(
                    "object-cover rounded-md transition-transform duration-300 group-hover:scale-105",
                    motionSafe.transform,
                  )}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  priority={isPriority}
                  loading={isPriority ? "eager" : "lazy"}
                  placeholder="blur"
                  blurDataURL={post.blurDataURL}
                />
              </div>
            )}
            <div className={`p-2 md:p-3 flex-1 flex flex-col ${layout === "horizontal" ? "ml-2 md:ml-0" : ""}`}>
              <h3
                className={cn(
                  "text-xs md:text-sm font-semibold group-hover:text-blue-600 transition-colors duration-200",
                  motionSafe.transition,
                )}
              >
                {post.title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-auto pt-1">
                <Clock className="h-3 w-3" />
                <span>{post.formattedDate}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

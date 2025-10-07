import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { cn, formatRelativeDateSafely, motionSafe } from "@/lib/utils"
import { generateBlurDataURL } from "@/utils/lazy-load"
import { getArticleUrl } from "@/lib/utils/routing"

export interface FeaturedHeroProps {
  post: {
    title: string
    excerpt: string
    slug: string
    date: string
    country?: string
    featuredImage?: {
      node?: {
        sourceUrl?: string
      }
    }
    author?: {
      node?: {
        name?: string
      }
    }
  }
}

export function FeaturedHero({ post }: FeaturedHeroProps) {
  const formattedDate = formatRelativeDateSafely(post.date)
  const blurDataURL = generateBlurDataURL(800, 450)
  const imageUrl = post.featuredImage?.node?.sourceUrl || "/placeholder.svg"

  return (
    <Link href={getArticleUrl(post.slug, post.country)} className="block group">
      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <div className="relative aspect-[16/9] md:aspect-auto md:h-full w-full overflow-hidden rounded-lg">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={post.title}
            fill
            className={cn("object-cover transition-transform duration-300 group-hover:scale-105", motionSafe.transform)}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 640px"
            priority
            fetchPriority="high"
            placeholder="blur"
            blurDataURL={blurDataURL}
          />
        </div>
        <div className="flex flex-col justify-center">
          <h1
            className={cn(
              "text-xl md:text-2xl font-bold mb-2 md:mb-3 group-hover:text-blue-600 transition-colors duration-200",
              motionSafe.transition,
            )}
          >
            {post.title}
          </h1>
          <div className="text-gray-600 text-xs md:text-sm line-clamp-3" style={{ marginBottom: "1vw" }}>
            {post.excerpt.replace(/<[^>]*>/g, "")}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

import Image from "next/image"
import Link from "next/link"
import { cn, motionSafe } from "@/lib/utils"
import { getArticleUrl } from "@/lib/utils/routing"

interface FeaturedStoryProps {
  post: {
    title: string
    excerpt: string
    slug: string
    featuredImage: {
      node: {
        sourceUrl: string
      }
    }
  }
}

export function FeaturedStory({ post }: FeaturedStoryProps) {
  if (!post) {
    return null
  }

  return (
    <article className="mb-8">
      <Link href={getArticleUrl(post.slug)} className="block group">
        <div className="grid md:grid-cols-2 gap-4 items-center bg-white rounded-lg shadow-md overflow-hidden p-4">
          <div className="relative h-48 md:h-72 rounded-lg overflow-hidden">
            <Image
              src={
                post.featuredImage?.node?.sourceUrl || "/placeholder.svg?height=600&width=800&query=featured news story"
              }
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px"
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-105",
                motionSafe.transform,
              )}
              priority
              fetchPriority="high"
            />
          </div>
          <div>
            <h1
              className={cn(
                "text-xl md:text-3xl font-bold mb-3 group-hover:text-blue-600 transition-colors",
                motionSafe.transition,
              )}
            >
              {post.title}
            </h1>
            <div
              className="text-gray-600 text-base line-clamp-3 md:line-clamp-4"
              dangerouslySetInnerHTML={{ __html: post.excerpt }}
            />
            <div className="mt-4">
              <span className="inline-block text-blue-600 font-medium group-hover:underline">Read full story</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}

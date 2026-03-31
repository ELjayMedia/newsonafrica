import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns/formatDistanceToNow"

import { cn, motionSafe } from "@/lib/utils"
import { generateBlurDataURL } from "@/lib/utils/lazy-load"
import { getArticleUrl } from "@/lib/utils/routing"
import { Heading } from "@/components/ui/Heading"
import { Text } from "@/components/ui/Text"

export interface FeaturedHeroProps {
  post: {
    title: string
    excerpt: string
    slug: string
    date: string
    country?: string
    databaseId?: number
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
  const formattedDate = formatDistanceToNow(new Date(post.date), { addSuffix: true })
  const blurDataURL = generateBlurDataURL(800, 450)
  const imageUrl = post.featuredImage?.node?.sourceUrl || "/placeholder.svg"

  return (
    <Link href={getArticleUrl(post.slug, post.country, post.databaseId)} className="block group">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 bg-background shadow-none py-1">
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
        <div className="flex flex-col justify-center px-1 sm:px-0">
          <Heading 
            level="h1"
            className={cn(
              "mb-2 md:mb-3 group-hover:text-primary transition-colors duration-200",
              motionSafe.transition,
            )}
          >
            {post.title}
          </Heading>
          <Text 
            size="sm"
            color="muted"
            className="line-clamp-3 mb-2 md:mb-3"
          >
            {post.excerpt.replace(/<[^>]*>/g, "")}
          </Text>
          <div className="flex items-center gap-1 text-ui-sm text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

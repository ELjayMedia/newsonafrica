import { memo } from "react"
import type { Article } from "@/types/article"
import type { WordPressPost } from "@/types/wp"
import { LegacyArticleCard } from "@/components/LegacyArticleCard"

type VerticalCardPost =
  | Article
  | WordPressPost
  | ({
      id?: string
      title: string
      slug: string
      date: string
      type?: string
      excerpt?: string
      featuredImage?: Article["featuredImage"]
      author?: Article["author"]
      categories?: Article["categories"]
    } & Record<string, unknown>)

interface VerticalCardProps {
  post: VerticalCardPost
  className?: string
  showExcerpt?: boolean
  priority?: boolean
}

export const VerticalCard = memo(function VerticalCard({
  post,
  className,
  showExcerpt = false,
  priority = false,
}: VerticalCardProps) {
  const adaptedArticle = { id: (post as any).id ?? post.slug, ...post }

  return (
    <LegacyArticleCard
      article={adaptedArticle as Article | WordPressPost}
      layout="vertical"
      className={className}
      eyebrow={(post as any).type}
      showExcerpt={showExcerpt}
      priority={priority}
    />
  )
})

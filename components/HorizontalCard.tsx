import { memo } from "react"
import type { Article } from "@/types/article"
import type { WordPressPost } from "@/types/wp"
import { LegacyArticleCard } from "@/components/LegacyArticleCard"

interface HorizontalCardProps {
  post: Article | WordPressPost
  className?: string
  showExcerpt?: boolean
  priority?: boolean
}

export const HorizontalCard = memo(function HorizontalCard({
  post,
  className,
  showExcerpt = true,
  priority = false,
}: HorizontalCardProps) {
  return (
    <LegacyArticleCard
      article={post}
      layout="horizontal"
      className={className}
      showExcerpt={showExcerpt}
      priority={priority}
    />
  )
})

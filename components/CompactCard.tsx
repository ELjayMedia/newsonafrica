import { memo } from "react"
import type { Article } from "@/types/article"
import type { WordPressPost } from "@/types/wp"
import { LegacyArticleCard } from "@/components/LegacyArticleCard"

type CompactCardLayout = "horizontal" | "vertical" | "minimal"

interface CompactCardProps {
  post: Article | WordPressPost
  layout?: CompactCardLayout
  showExcerpt?: boolean
  className?: string
  priority?: boolean
}

export const CompactCard = memo(function CompactCard({
  post,
  layout = "horizontal",
  showExcerpt = false,
  className,
  priority = false,
}: CompactCardProps) {
  const mappedLayout = layout === "vertical" ? "vertical" : layout === "minimal" ? "minimal" : "horizontal"

  return (
    <LegacyArticleCard
      article={post}
      layout={mappedLayout}
      className={className}
      showExcerpt={showExcerpt}
      priority={priority}
    />
  )
})

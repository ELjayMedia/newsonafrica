import { memo } from "react"
import type { Article } from "@/types/article"
import type { WordPressPost } from "@/types/wp"
import { ArticleCard } from "@/components/ArticleCard"

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
    <ArticleCard
      article={post}
      layout={mappedLayout}
      className={className}
      showExcerpt={showExcerpt}
      priority={priority}
    />
  )
})

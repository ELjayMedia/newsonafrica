import {
  RegularCategorySection,
  SportCategorySection,
  type NewsGridPost,
} from "./news-grid/NewsGridSections"

export interface NewsGridProps {
  posts: NewsGridPost[]
  layout?: "vertical" | "horizontal" | "mixed"
  className?: string
  sportCategoryPosts?: NewsGridPost[]
  showSportCategory?: boolean
}

export function NewsGrid({
  posts,
  className = "",
  sportCategoryPosts = [],
  showSportCategory = false,
}: NewsGridProps) {
  const hasPosts = posts?.length > 0
  const hasSportCategoryPosts = sportCategoryPosts?.length > 0

  if (!hasPosts && (!showSportCategory || !hasSportCategoryPosts)) {
    return null
  }

  const mainPost = posts?.[0]
  const secondaryPosts = posts?.slice(1, 4) ?? []

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 ${className}`.trim()}>
      {showSportCategory && hasSportCategoryPosts ? (
        <SportCategorySection sportCategoryPosts={sportCategoryPosts} />
      ) : (
        <RegularCategorySection mainPost={mainPost} secondaryPosts={secondaryPosts} />
      )}
    </div>
  )
}

export type { NewsGridPost }

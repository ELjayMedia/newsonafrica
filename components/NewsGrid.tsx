import { generateBlurDataURL } from "@/lib/utils/lazy-load"

import { RegularCategorySection, SportCategorySection, type NewsGridPost } from "./news-grid/NewsGridSections"

interface NewsGridProps {
  posts: NewsGridPost[]
  className?: string
  sportCategoryPosts?: NewsGridPost[]
  showSportCategory?: boolean
}

const buildBlurPlaceholders = (posts: NewsGridPost[], sportCategoryPosts: NewsGridPost[]) => {
  const safeLength = Math.max(posts.length, sportCategoryPosts.length, 1)
  return {
    main: generateBlurDataURL(400, 300),
    secondary: Array.from({ length: safeLength }, () => generateBlurDataURL(70, 70)),
  }
}

export function NewsGrid({
  posts,
  className = "",
  sportCategoryPosts = [],
  showSportCategory = false,
}: NewsGridProps) {
  const hasPosts = posts.length > 0
  const hasSportCategoryPosts = sportCategoryPosts.length > 0

  if (!hasPosts && (!showSportCategory || !hasSportCategoryPosts)) {
    return null
  }

  const blurPlaceholders = buildBlurPlaceholders(posts, sportCategoryPosts)
  const mainPost = posts[0]
  const secondaryPosts = posts.slice(1, 4)

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 ${className}`.trim()}>
      {showSportCategory && hasSportCategoryPosts ? (
        <SportCategorySection sportCategoryPosts={sportCategoryPosts} blurURLs={blurPlaceholders} />
      ) : (
        <RegularCategorySection mainPost={mainPost} secondaryPosts={secondaryPosts} blurURLs={blurPlaceholders} />
      )}
    </div>
  )
}

export { type NewsGridPost }

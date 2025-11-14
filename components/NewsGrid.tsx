import { generateBlurDataURL } from "@/lib/utils/lazy-load"

import {
  RegularCategorySection,
  SportCategorySection,
  type BlurPlaceholders,
  type NewsGridPost,
} from "./news-grid/NewsGridSections"

export interface NewsGridProps {
  posts: NewsGridPost[]
  layout?: "vertical" | "horizontal" | "mixed"
  className?: string
  sportCategoryPosts?: NewsGridPost[]
  showSportCategory?: boolean
}

function createBlurPlaceholders(maxLength: number): BlurPlaceholders {
  const safeLength = Math.max(maxLength, 1)

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
  const hasPosts = posts?.length > 0
  const hasSportCategoryPosts = sportCategoryPosts?.length > 0

  if (!hasPosts && (!showSportCategory || !hasSportCategoryPosts)) {
    return null
  }

  const mainPost = posts?.[0]
  const secondaryPosts = posts?.slice(1, 4) ?? []
  const blurPlaceholders = createBlurPlaceholders(
    Math.max(posts?.length ?? 0, sportCategoryPosts?.length ?? 0),
  )

  return (
    <div
      className={`grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 xl:gap-5 ${className}`.trim()}
    >
      {showSportCategory && hasSportCategoryPosts ? (
        <SportCategorySection sportCategoryPosts={sportCategoryPosts} blurURLs={blurPlaceholders} />
      ) : (
        <RegularCategorySection
          mainPost={mainPost}
          secondaryPosts={secondaryPosts}
          blurURLs={blurPlaceholders}
        />
      )}
    </div>
  )
}

export type { NewsGridPost }

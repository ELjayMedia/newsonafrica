"use client"

import { ArticleList } from "@/components/ArticleList"
import { getLatestPostsForCountry } from "@/lib/wordpress-api"
import type { WordPressPost } from "@/lib/wordpress-api"

interface MoreForYouSectionProps {
  countryCode: string
  initialData?: {
    posts: WordPressPost[]
    hasNextPage: boolean
    endCursor: string | null
  }
}

export function MoreForYouSection({ countryCode, initialData }: MoreForYouSectionProps) {
  return (
    <ArticleList
      fetcher={(cursor) => getLatestPostsForCountry(countryCode, 20, cursor)}
      initialData={initialData}
      layout="standard"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    />
  )
}

export default MoreForYouSection

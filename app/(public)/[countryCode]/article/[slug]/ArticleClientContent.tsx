import type { WordPressPost } from "@/types/wp"

import { fetchArticleWithFallbackAction } from "./actions"
import { ArticleClientShell } from "./ArticleClientShell"

interface ArticleClientContentProps {
  slug: string
  countryCode: string
  sourceCountryCode?: string
  initialData: any
  relatedPosts: WordPressPost[]
  fetchArticleWithFallback?: typeof fetchArticleWithFallbackAction
}

export function ArticleClientContent({
  slug,
  countryCode,
  sourceCountryCode,
  initialData,
  relatedPosts,
  fetchArticleWithFallback = fetchArticleWithFallbackAction,
}: ArticleClientContentProps) {
  return (
    <ArticleClientShell
      slug={slug}
      countryCode={countryCode}
      sourceCountryCode={sourceCountryCode}
      initialData={initialData}
      relatedPosts={relatedPosts}
      fetchArticleWithFallback={fetchArticleWithFallback}
      initialComments={[]}
      initialCommentCursor={null}
      initialCommentHasMore={false}
      initialCommentTotal={0}
    />
  )
}

import type { WordPressPost } from "@/types/wp"

import { fetchArticleWithFallbackAction, fetchCommentsPageAction } from "./actions"
import { ArticleClientShell } from "./ArticleClientShell"
import { isSupabaseConfigured } from "@/utils/supabase/env"

interface ArticleClientContentProps {
  slug: string
  countryCode: string
  sourceCountryCode?: string
  initialData: any
  relatedPosts: WordPressPost[]
  fetchArticleWithFallback?: typeof fetchArticleWithFallbackAction
}

export async function ArticleClientContent({
  slug,
  countryCode,
  sourceCountryCode,
  initialData,
  relatedPosts,
  fetchArticleWithFallback = fetchArticleWithFallbackAction,
}: ArticleClientContentProps) {
  const postId = initialData?.id != null ? String(initialData.id) : null
  const supabaseAvailable = isSupabaseConfigured()
  const initialCommentsResult =
    postId !== null && supabaseAvailable
      ? await fetchCommentsPageAction({ postId, pageSize: 10 })
      : { comments: [], hasMore: false, nextCursor: null, total: 0 }

  return (
    <ArticleClientShell
      slug={slug}
      countryCode={countryCode}
      sourceCountryCode={sourceCountryCode}
      initialData={initialData}
      relatedPosts={relatedPosts}
      fetchArticleWithFallback={fetchArticleWithFallback}
      initialComments={initialCommentsResult.comments}
      initialCommentCursor={initialCommentsResult.nextCursor ?? null}
      initialCommentHasMore={initialCommentsResult.hasMore}
      initialCommentTotal={
        typeof initialCommentsResult.total === "number"
          ? initialCommentsResult.total
          : initialCommentsResult.comments.length
      }
    />
  )
}

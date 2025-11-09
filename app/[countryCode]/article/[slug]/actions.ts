"use server"

import type { CommentSortOption } from "@/lib/supabase-schema"
import { fetchComments } from "@/lib/comment-service"
import { createServerComponentSupabaseClient } from "@/lib/supabase/server-component-client"
import { getRelatedPostsForCountry } from "@/lib/wordpress/posts"
import type { WordPressPost } from "@/types/wp"

import { ARTICLE_NOT_FOUND_ERROR_MESSAGE } from "./constants"
import {
  buildArticleCountryPriority,
  loadArticleWithFallback,
  normalizeCountryCode,
  normalizeSlug,
  resolveEdition,
} from "./article-data"

interface FetchCommentsPageActionInput {
  postId: string
  page?: number
  pageSize?: number
  sortOption?: CommentSortOption
  cursor?: string | null
}

export async function fetchCommentsPageAction({
  postId,
  page = 0,
  pageSize = 10,
  sortOption = "newest",
  cursor = null,
}: FetchCommentsPageActionInput) {
  const supabase = createServerComponentSupabaseClient()
  if (!supabase) {
    return { comments: [], hasMore: false, nextCursor: null, total: 0 }
  }
  return fetchComments(postId, page, pageSize, sortOption, supabase, cursor ?? undefined)
}

export interface FetchArticleWithFallbackActionInput {
  countryCode: string
  slug: string
}

export interface FetchArticleWithFallbackActionResult {
  article: WordPressPost
  sourceCountry: string
  relatedPosts: WordPressPost[]
}

export async function fetchArticleWithFallbackAction({
  countryCode,
  slug,
}: FetchArticleWithFallbackActionInput): Promise<FetchArticleWithFallbackActionResult> {
  const edition = resolveEdition(countryCode)

  if (!edition) {
    throw new Error(ARTICLE_NOT_FOUND_ERROR_MESSAGE)
  }

  const editionCountry = normalizeCountryCode(edition.code)
  const normalizedSlug = normalizeSlug(slug)
  const countryPriority = buildArticleCountryPriority(editionCountry)
  const resolvedArticle = await loadArticleWithFallback(normalizedSlug, countryPriority)

  if (resolvedArticle === null) {
    throw new Error(ARTICLE_NOT_FOUND_ERROR_MESSAGE)
  }

  const postId = resolvedArticle.article?.id != null ? String(resolvedArticle.article.id) : null
  const relatedCountry = resolvedArticle.sourceCountry ?? editionCountry
  const relatedPosts =
    postId !== null ? await getRelatedPostsForCountry(relatedCountry, postId, 6) : []

  return {
    article: resolvedArticle.article,
    sourceCountry: resolvedArticle.sourceCountry,
    relatedPosts,
  }
}


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
  editionCode: string
  page?: number
  pageSize?: number
  sortOption?: CommentSortOption
  cursor?: string | null
}

export async function fetchCommentsPageAction({
  postId,
  editionCode,
  page = 0,
  pageSize = 10,
  sortOption = "newest",
  cursor = null,
}: FetchCommentsPageActionInput) {
  const supabase = createServerComponentSupabaseClient()
  if (!supabase) {
    return { comments: [], hasMore: false, nextCursor: null, total: 0 }
  }
  return fetchComments(postId, editionCode, page, pageSize, sortOption, supabase, cursor ?? undefined)
}

export interface FetchArticleWithFallbackActionInput {
  countryCode: string
  slug: string
}

export interface FetchArticleWithFallbackActionResult {
  article: WordPressPost | null
  sourceCountry: string
  relatedPosts: WordPressPost[]
  error?: "temporary_error"
}

const resolveRelatedPostId = (article: {
  databaseId?: number | null
  id?: unknown
} | null | undefined) => {
  if (typeof article?.databaseId === "number" && Number.isFinite(article.databaseId)) {
    return article.databaseId
  }

  const relayId = article?.id
  if (typeof relayId !== "string") {
    return null
  }

  let decodedRelayId: string

  try {
    decodedRelayId = Buffer.from(relayId, "base64").toString("utf8")
  } catch {
    return null
  }

  const decodedId = Number(decodedRelayId.split(":").pop())
  return Number.isFinite(decodedId) ? decodedId : null
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

  if (resolvedArticle.status === "not_found") {
    throw new Error(ARTICLE_NOT_FOUND_ERROR_MESSAGE)
  }

  const usingStaleContent = resolvedArticle.status === "temporary_error"
  const articleData =
    resolvedArticle.status === "found"
      ? resolvedArticle.article
      : resolvedArticle.staleArticle ?? null

  if (!articleData) {
    if (resolvedArticle.status === "temporary_error") {
      return {
        article: null,
        sourceCountry: editionCountry,
        relatedPosts: [],
        error: "temporary_error",
      }
    }
    throw new Error(ARTICLE_NOT_FOUND_ERROR_MESSAGE)
  }

  const sourceCountry =
    resolvedArticle.status === "found"
      ? resolvedArticle.sourceCountry ?? editionCountry
      : resolvedArticle.staleSourceCountry ?? editionCountry

  const relatedPostId = resolveRelatedPostId(articleData)
  let relatedPosts: WordPressPost[] = []

  if (relatedPostId !== null) {
    try {
      relatedPosts = await getRelatedPostsForCountry(sourceCountry, relatedPostId, 6)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to load related posts in fetchArticleWithFallbackAction", {
          error,
          sourceCountry,
          relatedPostId,
          slug: normalizedSlug,
          usingStaleContent,
        })
      }
      relatedPosts = []
    }
  }

  const result: FetchArticleWithFallbackActionResult = {
    article: articleData,
    sourceCountry,
    relatedPosts,
  }

  if (resolvedArticle.status === "temporary_error") {
    result.error = "temporary_error"
  }

  return result
}

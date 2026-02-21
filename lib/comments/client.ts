import type { Comment, NewComment, ReportCommentData, CommentSortOption } from "@/lib/supabase-schema"

import { ApiRequestError, parseApiEnvelope } from "@/lib/comments/contracts"
import { createOptimisticComment } from "@/lib/comments/optimistic"

const toQuery = (params: Record<string, string | number | null | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  }
  return search.toString()
}

export async function fetchComments(
  wpPostId: string,
  editionCode: string,
  page = 0,
  pageSize = 10,
  sortOption: CommentSortOption = "newest",
  _client?: unknown,
  cursor?: string,
): Promise<{ comments: Comment[]; hasMore: boolean; nextCursor: string | null; total?: number }> {
  const query = toQuery({
    wp_post_id: wpPostId,
    edition_code: editionCode,
    page,
    limit: pageSize,
    sort: sortOption,
    cursor,
  })

  const payload = await parseApiEnvelope<{
    comments: Comment[]
    hasMore: boolean
    nextCursor: string | null
    totalCount?: number
  }>(await fetch(`/api/comments?${query}`, { credentials: "include", cache: "no-store" }))

  return {
    comments: payload.comments,
    hasMore: payload.hasMore,
    nextCursor: payload.nextCursor,
    total: payload.totalCount,
  }
}

export async function addComment(comment: NewComment): Promise<Comment | undefined> {
  const payload = await parseApiEnvelope<Comment>(
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comment),
      credentials: "include",
    }),
  )
  return payload
}

export async function updateComment(id: string, body: string, isRichText?: boolean): Promise<Comment | undefined> {
  return parseApiEnvelope<Comment>(
    await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, is_rich_text: isRichText === true }),
      credentials: "include",
    }),
  )
}

export async function deleteComment(id: string): Promise<void> {
  await parseApiEnvelope<{ success: boolean }>(
    await fetch(`/api/comments/${id}`, { method: "DELETE", credentials: "include" }),
  )
}

export async function reportComment(data: ReportCommentData): Promise<void> {
  await parseApiEnvelope<{ success: boolean }>(
    await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.commentId, action: "report", reason: data.reason }),
      credentials: "include",
    }),
  )
}

export function organizeComments(comments: Comment[]): Comment[] {
  return comments
}

export { ApiRequestError, createOptimisticComment }

export function clearCommentCache(): void {}

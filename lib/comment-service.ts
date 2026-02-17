import { v4 as uuidv4 } from "uuid"

import type { Comment, NewComment, ReportCommentData, CommentSortOption } from "@/lib/supabase-schema"

// Deprecated orchestration note:
// - Canonical comment domain logic now lives in lib/comments/service.ts and route handlers.
// - This file is a thin client/server fetch wrapper kept for backward compatibility.

export class ApiRequestError extends Error {
  readonly status: number
  readonly meta?: Record<string, unknown>

  constructor(message: string, status: number, meta?: Record<string, unknown>) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.meta = meta
  }

  get retryAfterSeconds(): number | null {
    const maybeRateLimit = this.meta?.rateLimit
    if (!maybeRateLimit || typeof maybeRateLimit !== "object") return null

    const candidate = (maybeRateLimit as { retryAfterSeconds?: unknown }).retryAfterSeconds
    return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null
  }
}

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  error?: string
  meta?: Record<string, unknown>
}

const toQuery = (params: Record<string, string | number | null | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  }
  return search.toString()
}

async function parseApi<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null
  if (!response.ok) {
    const meta =
      json && typeof json === "object" && "meta" in json && json.meta && typeof json.meta === "object"
        ? (json.meta as Record<string, unknown>)
        : undefined
    const message =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `Request failed (${response.status})`
    throw new ApiRequestError(message, response.status, meta)
  }

  if (json && typeof json === "object" && "success" in json) {
    const envelope = json as ApiEnvelope<T>
    if (!envelope.success || envelope.data === undefined) {
      throw new Error(envelope.error || "Request failed")
    }
    return envelope.data
  }

  return json as T
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

  const payload = await parseApi<{ comments: Comment[]; hasMore: boolean; nextCursor: string | null; totalCount?: number }>(
    await fetch(`/api/comments?${query}`, { credentials: "include", cache: "no-store" }),
  )

  return {
    comments: payload.comments,
    hasMore: payload.hasMore,
    nextCursor: payload.nextCursor,
    total: payload.totalCount,
  }
}

export async function addComment(comment: NewComment): Promise<Comment | undefined> {
  const payload = await parseApi<Comment>(
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
  return parseApi<Comment>(
    await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, is_rich_text: isRichText === true }),
      credentials: "include",
    }),
  )
}

export async function deleteComment(id: string): Promise<void> {
  await parseApi<{ success: boolean }>(await fetch(`/api/comments/${id}`, { method: "DELETE", credentials: "include" }))
}

export async function reportComment(data: ReportCommentData): Promise<void> {
  await parseApi<{ success: boolean }>(
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

export function createOptimisticComment(comment: NewComment, username: string, avatarUrl?: string | null): Comment {
  return {
    id: `optimistic-${uuidv4()}`,
    wp_post_id: comment.wp_post_id,
    edition_code: comment.edition_code,
    user_id: comment.user_id,
    body: comment.body,
    parent_id: comment.parent_id || null,
    created_at: new Date().toISOString(),
    status: "active",
    is_rich_text: comment.is_rich_text || false,
    reactions_count: 0,
    replies_count: 0,
    isOptimistic: true,
    profile: { username, avatar_url: avatarUrl || null },
    reactions: [],
    user_reaction: null,
    replies: [],
  }
}

export function clearCommentCache(): void {}

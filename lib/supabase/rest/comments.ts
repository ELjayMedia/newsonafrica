import { buildRestUrl } from "./client"
import { DEFAULT_LIMIT, MAX_LIMIT } from "./constants"
import { parseResponse } from "./errors"
import { authHeaders, jsonHeaders, preferHeaders, publicHeaders } from "./headers"
import type { Comment, CommentPostCounter, CommentReport, CommentWithProfile } from "./types"

type ApprovedCommentParams = {
  wp_post_id: number
  edition_code: string
  limit?: number
  offset?: number
  fetchOptions?: RequestInit
}

export async function listApprovedComments({
  wp_post_id,
  edition_code,
  limit = DEFAULT_LIMIT,
  offset = 0,
  fetchOptions,
}: ApprovedCommentParams): Promise<CommentWithProfile[]> {
  const params = new URLSearchParams({
    select:
      "id,user_id,wp_post_id,edition_code,parent_id,body,status,created_at,updated_at,profiles(display_name,avatar_url)",
    wp_post_id: `eq.${wp_post_id}`,
    edition_code: `eq.${edition_code}`,
    status: "eq.approved",
    order: "created_at.asc",
    limit: String(Math.min(limit, MAX_LIMIT)),
    offset: String(offset),
  })

  const url = buildRestUrl("comments", params)

  const response = await fetch(url, {
    ...fetchOptions,
    headers: publicHeaders(),
  })

  return parseResponse<CommentWithProfile[]>(response)
}

export async function createComment(params: {
  accessToken: string
  wp_post_id: number
  edition_code: string
  body: string
  parent_id?: string
  fetchOptions?: RequestInit
}): Promise<Comment> {
  if (!params.body || params.body.length < 1 || params.body.length > 5000) {
    throw new Error("Comment must be between 1 and 5000 characters")
  }

  const url = buildRestUrl("comments")

  const response = await fetch(url, {
    method: "POST",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify({
      wp_post_id: params.wp_post_id,
      edition_code: params.edition_code,
      body: params.body,
      parent_id: params.parent_id ?? null,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<Comment[]>(response)
  return data[0]
}

export async function updateMyCommentBody(params: {
  accessToken: string
  id: string
  body: string
  fetchOptions?: RequestInit
}): Promise<Comment> {
  const url = buildRestUrl("comments", new URLSearchParams({ id: `eq.${params.id}` }))

  const response = await fetch(url, {
    method: "PATCH",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify({ body: params.body }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<Comment[]>(response)
  return data[0]
}

export async function deleteMyComment(params: {
  accessToken: string
  id: string
  fetchOptions?: RequestInit
}): Promise<void> {
  const url = buildRestUrl("comments", new URLSearchParams({ id: `eq.${params.id}` }))

  const response = await fetch(url, {
    method: "DELETE",
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  await parseResponse<void>(response)
}

export async function reportComment(params: {
  accessToken: string
  comment_id: string
  reason?: string
  fetchOptions?: RequestInit
}): Promise<CommentReport> {
  const url = buildRestUrl("comment_reports")

  const response = await fetch(url, {
    method: "POST",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify({
      comment_id: params.comment_id,
      reason: params.reason ?? null,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<CommentReport[]>(response)
  return data[0]
}

export async function getCommentCounters(params: {
  wp_post_id: number
  edition_code: string
  fetchOptions?: RequestInit
}): Promise<CommentPostCounter | null> {
  const searchParams = new URLSearchParams({
    select: "wp_post_id,edition_code,total_comments,approved_comments,updated_at",
    wp_post_id: `eq.${params.wp_post_id}`,
    edition_code: `eq.${params.edition_code}`,
    limit: "1",
  })

  const url = buildRestUrl("comment_post_counters", searchParams)

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: publicHeaders(),
  })

  const data = await parseResponse<CommentPostCounter[]>(response)
  return data[0] ?? null
}

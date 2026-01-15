import "server-only"

import { buildRestUrl } from "../client"
import { parseResponse } from "../errors"
import { jsonHeaders, preferHeaders } from "../headers"
import { serviceRoleHeaders } from "../server"
import type { Comment } from "../types"

export async function listCommentsForModerationServerOnly(params?: {
  status?: string
  limit?: number
  fetchOptions?: RequestInit
}): Promise<Comment[]> {
  const searchParams = new URLSearchParams({
    select: "id,wp_post_id,user_id,body,edition_code,status,created_at",
    order: "created_at.desc",
    limit: String(params?.limit ?? 100),
  })

  if (params?.status && params.status !== "all") {
    searchParams.append("status", `eq.${params.status}`)
  }

  const url = buildRestUrl("comments", searchParams)

  const response = await fetch(url, {
    ...params?.fetchOptions,
    headers: serviceRoleHeaders(),
    cache: params?.fetchOptions?.cache ?? "no-store",
  })

  return parseResponse<Comment[]>(response)
}

export async function updateCommentServerOnly(params: {
  id: string
  updates: Partial<Pick<Comment, "status" | "body" | "reviewed_at" | "reviewed_by">>
  fetchOptions?: RequestInit
}): Promise<Comment> {
  const url = buildRestUrl("comments", new URLSearchParams({ id: `eq.${params.id}` }))

  const response = await fetch(url, {
    method: "PATCH",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(serviceRoleHeaders()), "return=representation"),
    body: JSON.stringify(params.updates),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<Comment[]>(response)
  return data[0]
}

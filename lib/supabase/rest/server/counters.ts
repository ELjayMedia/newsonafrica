import "server-only"

import { buildRestUrl } from "../client"
import { parseResponse } from "../errors"
import { jsonHeaders, preferHeaders } from "../headers"
import { serviceRoleHeaders } from "../server"
import type { BookmarkUserCounter, CommentPostCounter } from "../types"

export async function upsertMyBookmarkCountersServerOnly(params: {
  user_id: string
  total_bookmarks: number
  unread_bookmarks: number
  fetchOptions?: RequestInit
}): Promise<BookmarkUserCounter> {
  const url = buildRestUrl("bookmark_user_counters")

  const response = await fetch(url, {
    method: "POST",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(serviceRoleHeaders()), "resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({
      user_id: params.user_id,
      total_bookmarks: params.total_bookmarks,
      unread_bookmarks: params.unread_bookmarks,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<BookmarkUserCounter[]>(response)
  return data[0]
}

export async function updateCommentCountersServerOnly(params: {
  wp_post_id: number
  edition_code: string
  total_comments: number
  approved_comments: number
  fetchOptions?: RequestInit
}): Promise<CommentPostCounter> {
  const url = buildRestUrl("comment_post_counters")

  const response = await fetch(url, {
    method: "POST",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(serviceRoleHeaders()), "resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({
      wp_post_id: params.wp_post_id,
      edition_code: params.edition_code,
      total_comments: params.total_comments,
      approved_comments: params.approved_comments,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<CommentPostCounter[]>(response)
  return data[0]
}

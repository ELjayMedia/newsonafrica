import { buildRestUrl } from "./client"
import { DEFAULT_LIMIT, MAX_LIMIT } from "./constants"
import { parseResponse } from "./errors"
import { authHeaders, jsonHeaders, preferHeaders } from "./headers"
import type { Bookmark } from "./types"

const BOOKMARK_SELECT =
  "id,user_id,wp_post_id,edition_code,collection_id,read_state,created_at,updated_at"

type BookmarkReadState = "unread" | "read"

type BookmarkListParams = {
  accessToken: string
  edition_code?: string
  collection_id?: string
  read_state?: BookmarkReadState
  limit?: number
  offset?: number
  fetchOptions?: RequestInit
}

export async function listMyBookmarks({
  accessToken,
  edition_code,
  collection_id,
  read_state,
  limit = DEFAULT_LIMIT,
  offset = 0,
  fetchOptions,
}: BookmarkListParams): Promise<Bookmark[]> {
  const params = new URLSearchParams({
    select: BOOKMARK_SELECT,
    order: "created_at.desc",
    limit: String(Math.min(limit, MAX_LIMIT)),
    offset: String(offset),
  })

  if (edition_code) {
    params.append("edition_code", `eq.${edition_code}`)
  }

  if (collection_id) {
    params.append("collection_id", `eq.${collection_id}`)
  }

  if (read_state) {
    params.append("read_state", `eq.${read_state}`)
  }

  const url = buildRestUrl("bookmarks", params)

  const response = await fetch(url, {
    ...fetchOptions,
    headers: authHeaders(accessToken),
    cache: fetchOptions?.cache ?? "no-store",
  })

  return parseResponse<Bookmark[]>(response)
}

export async function getBookmarkByPost(params: {
  accessToken: string
  wp_post_id: number
  edition_code: string
  fetchOptions?: RequestInit
}): Promise<Bookmark | null> {
  const searchParams = new URLSearchParams({
    select: BOOKMARK_SELECT,
    wp_post_id: `eq.${params.wp_post_id}`,
    edition_code: `eq.${params.edition_code}`,
    limit: "1",
  })

  const url = buildRestUrl("bookmarks", searchParams)

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<Bookmark[]>(response)
  return data[0] ?? null
}

export async function createBookmark(params: {
  accessToken: string
  wp_post_id: number
  edition_code: string
  collection_id?: string
  fetchOptions?: RequestInit
}): Promise<Bookmark> {
  const url = buildRestUrl("bookmarks")

  const response = await fetch(url, {
    method: "POST",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify({
      wp_post_id: params.wp_post_id,
      edition_code: params.edition_code,
      collection_id: params.collection_id ?? null,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<Bookmark[]>(response)
  return data[0]
}

export async function updateBookmarkReadState(params: {
  accessToken: string
  id: string
  read_state: BookmarkReadState
  fetchOptions?: RequestInit
}): Promise<Bookmark> {
  const url = buildRestUrl("bookmarks", new URLSearchParams({ id: `eq.${params.id}` }))

  const response = await fetch(url, {
    method: "PATCH",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify({ read_state: params.read_state }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<Bookmark[]>(response)
  return data[0]
}

export async function deleteBookmark(params: {
  accessToken: string
  id: string
  fetchOptions?: RequestInit
}): Promise<void> {
  const url = buildRestUrl("bookmarks", new URLSearchParams({ id: `eq.${params.id}` }))

  const response = await fetch(url, {
    method: "DELETE",
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  await parseResponse<void>(response)
}

export async function deleteBookmarksForPost(params: {
  accessToken: string
  wp_post_id: number
  edition_code: string
  fetchOptions?: RequestInit
}): Promise<void> {
  const url = buildRestUrl(
    "bookmarks",
    new URLSearchParams({
      wp_post_id: `eq.${params.wp_post_id}`,
      edition_code: `eq.${params.edition_code}`,
    }),
  )

  const response = await fetch(url, {
    method: "DELETE",
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  await parseResponse<void>(response)
}

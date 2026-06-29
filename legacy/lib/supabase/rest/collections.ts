import { buildRestUrl } from "./client"
import { parseResponse } from "./errors"
import { authHeaders, jsonHeaders, preferHeaders } from "./headers"
import type { BookmarkCollection } from "./types"

const COLLECTION_SELECT = "id,user_id,name,description,is_default,created_at,updated_at"

export async function listMyCollections(params: {
  accessToken: string
  fetchOptions?: RequestInit
}): Promise<BookmarkCollection[]> {
  const searchParams = new URLSearchParams({
    select: COLLECTION_SELECT,
    order: "is_default.desc,name.asc",
  })

  const url = buildRestUrl("bookmark_collections", searchParams)

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  return parseResponse<BookmarkCollection[]>(response)
}

export async function createCollection(params: {
  accessToken: string
  name: string
  description?: string
  is_default?: boolean
  fetchOptions?: RequestInit
}): Promise<BookmarkCollection> {
  const url = buildRestUrl("bookmark_collections")

  const response = await fetch(url, {
    method: "POST",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify({
      name: params.name,
      description: params.description ?? null,
      is_default: params.is_default ?? false,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<BookmarkCollection[]>(response)
  return data[0]
}

export async function updateCollection(params: {
  accessToken: string
  id: string
  name?: string
  description?: string
  is_default?: boolean
  fetchOptions?: RequestInit
}): Promise<BookmarkCollection> {
  const url = buildRestUrl("bookmark_collections", new URLSearchParams({ id: `eq.${params.id}` }))

  const response = await fetch(url, {
    method: "PATCH",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify({
      name: params.name,
      description: params.description,
      is_default: params.is_default,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<BookmarkCollection[]>(response)
  return data[0]
}

export async function deleteCollection(params: {
  accessToken: string
  id: string
  fetchOptions?: RequestInit
}): Promise<void> {
  const url = buildRestUrl("bookmark_collections", new URLSearchParams({ id: `eq.${params.id}` }))

  const response = await fetch(url, {
    method: "DELETE",
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  await parseResponse<void>(response)
}

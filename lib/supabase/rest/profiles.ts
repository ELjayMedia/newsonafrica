import { buildRestUrl } from "./client"
import { parseResponse } from "./errors"
import { authHeaders, jsonHeaders, preferHeaders } from "./headers"
import type { Profile } from "./types"

const PROFILE_SELECT = "id,display_name,avatar_url,created_at,updated_at"

export async function getMyProfile(params: { accessToken: string; fetchOptions?: RequestInit }): Promise<Profile | null> {
  const searchParams = new URLSearchParams({
    select: PROFILE_SELECT,
    limit: "1",
  })

  const url = buildRestUrl("profiles", searchParams)

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<Profile[]>(response)
  return data[0] ?? null
}

export async function updateMyProfile(params: {
  accessToken: string
  display_name?: string
  avatar_url?: string
  fetchOptions?: RequestInit
}): Promise<Profile> {
  const url = buildRestUrl("profiles")

  const response = await fetch(url, {
    method: "PATCH",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(authHeaders(params.accessToken)), "return=representation"),
    body: JSON.stringify({
      display_name: params.display_name,
      avatar_url: params.avatar_url,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<Profile[]>(response)
  return data[0]
}

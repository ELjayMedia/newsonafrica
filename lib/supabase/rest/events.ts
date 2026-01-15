import { buildRestUrl } from "./client"
import { DEFAULT_LIMIT, MAX_LIMIT } from "./constants"
import { parseResponse } from "./errors"
import { authHeaders } from "./headers"
import type { AppWriteEvent } from "./types"

export async function listMyEvents(params: {
  accessToken: string
  limit?: number
  offset?: number
  fetchOptions?: RequestInit
}): Promise<AppWriteEvent[]> {
  const searchParams = new URLSearchParams({
    select: "id,user_id,action,key,created_at",
    order: "created_at.desc",
    limit: String(Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)),
    offset: String(params.offset ?? 0),
  })

  const url = buildRestUrl("app_write_events", searchParams)

  const response = await fetch(url, {
    ...params.fetchOptions,
    headers: authHeaders(params.accessToken),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  return parseResponse<AppWriteEvent[]>(response)
}

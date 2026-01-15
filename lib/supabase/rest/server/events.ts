import "server-only"

import { buildRestUrl } from "../client"
import { parseResponse } from "../errors"
import { jsonHeaders, preferHeaders } from "../headers"
import { serviceRoleHeaders } from "../server"
import type { AppWriteEvent } from "../types"

export async function logEventServerOnly(params: {
  user_id?: string
  action: string
  key?: string
  fetchOptions?: RequestInit
}): Promise<AppWriteEvent> {
  const url = buildRestUrl("app_write_events")

  const response = await fetch(url, {
    method: "POST",
    ...params.fetchOptions,
    headers: preferHeaders(jsonHeaders(serviceRoleHeaders()), "return=representation"),
    body: JSON.stringify({
      user_id: params.user_id ?? null,
      action: params.action,
      key: params.key ?? null,
    }),
    cache: params.fetchOptions?.cache ?? "no-store",
  })

  const data = await parseResponse<AppWriteEvent[]>(response)
  return data[0]
}

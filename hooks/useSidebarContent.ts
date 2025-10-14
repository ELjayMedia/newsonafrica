import useSWR from "swr"

import type { SidebarContentPayload } from "@/types/sidebar"

const SIDEBAR_ENDPOINT = "/api/sidebar"
const RECENT_LIMIT = 10
const MOST_READ_LIMIT = 10

async function requestSidebarContent(country: string): Promise<SidebarContentPayload> {
  const params = new URLSearchParams({
    country,
    recentLimit: String(RECENT_LIMIT),
    mostReadLimit: String(MOST_READ_LIMIT),
  })

  const response = await fetch(`${SIDEBAR_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || "Failed to load sidebar content")
  }

  const payload = (await response.json().catch(() => ({}))) as Partial<SidebarContentPayload> | undefined

  const recent = Array.isArray(payload?.recent) ? payload.recent : []
  const mostRead = Array.isArray(payload?.mostRead) ? payload.mostRead : []

  return { recent, mostRead }
}

export async function fetchSidebarContentData(country: string): Promise<SidebarContentPayload> {
  return requestSidebarContent(country)
}

export function useSidebarContent(country: string) {
  return useSWR<SidebarContentPayload>(
    ["sidebar-content", country],
    () => requestSidebarContent(country),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000 * 60 * 3,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    },
  )
}

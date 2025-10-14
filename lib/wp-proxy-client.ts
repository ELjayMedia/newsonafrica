"use client"

export type WpProxyRequest = {
  endpoint: string
  method?: string
  params?: Record<string, string | number | string[] | undefined>
  payload?: unknown
  countryCode?: string
  withHeaders?: boolean
  timeout?: number
}

export async function wpProxyRequest<T>(request: WpProxyRequest): Promise<T> {
  const response = await fetch("/api/wp-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  })

  if (!response.ok) {
    let message = `WordPress proxy request failed with status ${response.status}`
    try {
      const errorBody = await response.json()
      if (errorBody?.error) {
        message = errorBody.error
      }
    } catch {
      // Ignore JSON parsing errors for error responses
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new Error("Invalid JSON response from WordPress proxy")
  }
}

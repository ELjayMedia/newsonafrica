import { getSupabaseBrowserEnv } from "@/config/supabase-env"

export function getRestBaseUrl(): string {
  const { supabaseUrl } = getSupabaseBrowserEnv()
  return `${supabaseUrl}/rest/v1`
}

export function buildRestUrl(path: string, params?: URLSearchParams): string {
  const normalizedPath = path.replace(/^\/+/, "")
  const baseUrl = `${getRestBaseUrl()}/${normalizedPath}`

  if (!params || [...params.keys()].length === 0) {
    return baseUrl
  }

  return `${baseUrl}?${params.toString()}`
}

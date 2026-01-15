const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export const REST_BASE_URL = `${SUPABASE_URL}/rest/v1`

export function buildRestUrl(path: string, params?: URLSearchParams): string {
  const normalizedPath = path.replace(/^\/+/, "")
  const baseUrl = `${REST_BASE_URL}/${normalizedPath}`

  if (!params || [...params.keys()].length === 0) {
    return baseUrl
  }

  return `${baseUrl}?${params.toString()}`
}

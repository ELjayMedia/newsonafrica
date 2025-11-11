const SUPABASE_PLACEHOLDER = "__SUPABASE_UNCONFIGURED__"

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_PLACEHOLDER
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_PLACEHOLDER
}

const sanitizeValue = (value: string | undefined | null): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed === SUPABASE_PLACEHOLDER) {
    return null
  }

  return trimmed
}

export const getSupabaseEnv = () => ({
  url: sanitizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  anonKey: sanitizeValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
})

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseEnv()
  return Boolean(url && anonKey)
}

export { SUPABASE_PLACEHOLDER }

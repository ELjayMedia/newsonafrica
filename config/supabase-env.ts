export interface SupabaseBrowserEnv {
  supabaseUrl: string
  supabaseAnonKey: string
}

export interface SupabaseServerEnv extends SupabaseBrowserEnv {
  supabaseServiceRoleKey: string
}

const SUPABASE_ENV_ERROR_BASE = "Supabase environment variables are misconfigured."
const SUPABASE_ENV_CALIBRATION_PATH =
  "Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (server-only)."

function readEnv(name: string): string | null {
  const value = process.env[name]

  if (!value) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function createSupabaseEnvError(missingVariables: string[]): Error {
  const missing = missingVariables.join(", ")
  return new Error(`${SUPABASE_ENV_ERROR_BASE} Missing: ${missing}. ${SUPABASE_ENV_CALIBRATION_PATH}`)
}

export const SUPABASE_UNAVAILABLE_ERROR = createSupabaseEnvError([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]).message

function parseSupabaseBrowserEnv(): SupabaseBrowserEnv | null {
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL")
  const supabaseAnonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}

export function hasSupabaseBrowserEnv(): boolean {
  return Boolean(parseSupabaseBrowserEnv())
}

export function getSupabaseBrowserEnv(): SupabaseBrowserEnv {
  const env = parseSupabaseBrowserEnv()

  if (!env) {
    throw createSupabaseEnvError(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])
  }

  return env
}

export function getSupabaseBrowserEnvOrNull(): SupabaseBrowserEnv | null {
  return parseSupabaseBrowserEnv()
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  const browserEnv = parseSupabaseBrowserEnv()
  const supabaseServiceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY")

  const missingVariables: string[] = []

  if (!browserEnv?.supabaseUrl) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_URL")
  }

  if (!browserEnv?.supabaseAnonKey) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  if (!supabaseServiceRoleKey) {
    missingVariables.push("SUPABASE_SERVICE_ROLE_KEY")
  }

  if (missingVariables.length > 0) {
    throw createSupabaseEnvError(missingVariables)
  }

  return {
    ...browserEnv,
    supabaseServiceRoleKey,
  }
}

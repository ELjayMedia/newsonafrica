import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/types/supabase"
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
  type SessionCookieProfile,
} from "@/lib/auth/session-cookie"
import {
  getSupabaseClient as getBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/api/supabase"

let hasWarnedAboutConfig = false

export const SUPABASE_CONFIGURATION_ERROR_MESSAGE =
  "We're still configuring our backend services, so this feature isn't available right now. Please try again later."

interface SupabaseClientSuccessResult {
  client: SupabaseClient<Database>
  isFallback: false
  error: null
}

interface SupabaseClientFallbackResult {
  client: SupabaseClient<Database>
  isFallback: true
  error: Error
}

export type SupabaseServerComponentClientResult =
  | SupabaseClientSuccessResult
  | SupabaseClientFallbackResult

function createFallbackClient(message: string): SupabaseClientFallbackResult {
  if (!hasWarnedAboutConfig) {
    hasWarnedAboutConfig = true
    console.warn(`${message} Using fallback client.`)
  }

  return {
    client: getBrowserSupabaseClient(),
    isFallback: true,
    error: new Error(message),
  }
}

export function getSupabaseClient(): SupabaseServerComponentClientResult {
  if (!isSupabaseConfigured()) {
    return createFallbackClient(SUPABASE_CONFIGURATION_ERROR_MESSAGE)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return createFallbackClient(SUPABASE_CONFIGURATION_ERROR_MESSAGE)
  }

  const cookieStore = cookies()

  return {
    client: createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value ?? null
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Setting cookies is unsupported in some server contexts.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 })
          } catch {
            // Removing cookies is unsupported in some server contexts.
          }
        },
      },
    }),
    isFallback: false,
    error: null,
  }
}

export interface ServerUserSession {
  session: Session | null
  user: User | null
  profile: SessionCookieProfile | null
  success: boolean
  error: string | null
  fromCache: boolean
}

async function fetchProfileSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SessionCookieProfile> {
  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("username, avatar_url, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("Failed to load profile for session cookie", error)
  }

  return {
    userId,
    username: profileData?.username ?? null,
    avatar_url: profileData?.avatar_url ?? null,
    role: profileData?.role ?? null,
    created_at: profileData?.created_at ?? null,
    updated_at: profileData?.updated_at ?? null,
  }
}

export async function getServerUserSession(): Promise<ServerUserSession> {
  const { payload, stale } = await readSessionCookie()

  if (payload && !stale) {
    return {
      session: null,
      user: null,
      profile: payload,
      success: true,
      error: null,
      fromCache: true,
    }
  }

  const result = getSupabaseClient()

  if (result.isFallback) {
    return {
      session: null,
      user: null,
      profile: null,
      success: false,
      error: result.error.message,
      fromCache: false,
    }
  }

  const supabase = result.client
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error("Failed to fetch Supabase session", error)
    return {
      session: null,
      user: null,
      profile: null,
      success: false,
      error: error.message,
      fromCache: false,
    }
  }

  const user = session?.user ?? null

  if (!user) {
    await clearSessionCookie()
    return {
      session: null,
      user: null,
      profile: null,
      success: true,
      error: null,
      fromCache: false,
    }
  }

  const profile = await fetchProfileSummary(supabase, user.id)
  await writeSessionCookie(profile)

  return {
    session,
    user,
    profile,
    success: true,
    error: null,
    fromCache: false,
  }
}

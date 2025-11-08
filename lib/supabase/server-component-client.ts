import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/types/supabase"
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
  type SessionCookieProfile,
} from "@/lib/auth/session-cookie"

export const SUPABASE_CONFIGURATION_ERROR_MESSAGE =
  "Supabase environment variables are not configured. Authentication features are disabled."

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${SUPABASE_CONFIGURATION_ERROR_MESSAGE} Missing ${name}.`)
  }

  return value
}

export function createServerComponentSupabaseClient(): SupabaseClient<Database> {
  const supabaseUrl = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL")
  const supabaseAnonKey = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY")

  return createServerComponentClient<Database>({ cookies }, {
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
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

  let supabase: SupabaseClient<Database>
  try {
    supabase = createServerComponentSupabaseClient()
  } catch (error) {
    console.error("Failed to initialize Supabase client", error)
    return {
      session: null,
      user: null,
      profile: null,
      success: false,
      error: SUPABASE_CONFIGURATION_ERROR_MESSAGE,
      fromCache: false,
    }
  }

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

import type { Session, SupabaseClient } from "@supabase/supabase-js"

import { persistSessionCookie } from "@/lib/auth/session-cookie-client"
import type { SessionCookieProfile } from "@/lib/auth/session-cookie"
import type { Database } from "@/types/supabase"

import { getSupabaseBrowserClient } from "./client-runtime"
import type { UserProfile } from "./types"

function resolveClient(client?: SupabaseClient<Database>): SupabaseClient<Database> {
  return client ?? getSupabaseBrowserClient()
}

function createSessionCookiePayload(
  userId: string,
  profile: Partial<UserProfile> | null,
): SessionCookieProfile {
  return {
    userId,
    username: profile?.username ?? null,
    avatar_url: profile?.avatar_url ?? null,
    role: profile?.role ?? null,
    created_at: profile?.created_at ?? null,
    updated_at: profile?.updated_at ?? null,
  }
}

export async function persistSessionCookieForProfile(
  userId: string,
  profile: Partial<UserProfile> | null,
): Promise<void> {
  await persistSessionCookie(createSessionCookiePayload(userId, profile))
}

export interface SessionOptions {
  client?: SupabaseClient<Database>
}

export async function checkAndRefreshSession(
  options: SessionOptions = {},
): Promise<Session | null> {
  const client = resolveClient(options.client)
  const { data, error } = await client.auth.getSession()

  if (error) {
    console.error("Error getting session:", error)
    return null
  }

  const session = data.session

  if (!session || !session.expires_at) {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  const timeToExpiry = session.expires_at - now

  if (timeToExpiry < 300) {
    const { data: refreshData, error: refreshError } = await client.auth.refreshSession()

    if (refreshError) {
      console.error("Error refreshing session:", refreshError)
      return null
    }

    return refreshData.session
  }

  return session
}

export function getSessionExpiryTime(session: Session | null): string {
  if (!session || !session.expires_at) {
    return "Unknown"
  }

  const expiryDate = new Date(session.expires_at * 1000)
  return expiryDate.toLocaleString()
}

import type { Session, SupabaseClient, User } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"
import { createServerClient } from "@/utils/supabase/server"
import type { SessionCookieProfile } from "@/lib/auth/session-cookie"

export type SupabaseServerComponentClient = SupabaseClient<Database>

export function createServerComponentSupabaseClient(): SupabaseServerComponentClient {
  return createServerClient()
}

export interface ServerUserSession {
  session: Session | null
  user: User | null
  profile: SessionCookieProfile | null
}

async function fetchProfileSummary(
  supabase: SupabaseServerComponentClient,
  userId: string,
): Promise<SessionCookieProfile> {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("username, avatar_url, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle()

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
  const supabase = createServerComponentSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
  const profile = user ? await fetchProfileSummary(supabase, user.id) : null

  return {
    session: session ?? null,
    user,
    profile,
  }
}

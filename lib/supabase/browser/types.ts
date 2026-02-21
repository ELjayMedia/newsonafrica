import type { Session, User } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

export const USER_PROFILE_SELECT_COLUMNS = "id, username, avatar_url, role, handle"

export interface SupabaseResponse<T = unknown> {
  data: T | null
  error: string | null
  success: boolean
}

export interface AuthResponse {
  user: User | null
  session: Session | null
  profile?: UserProfile | null
  error: string | null
  success: boolean
}

export interface UploadResponse {
  url: string | null
  path: string | null
  error: string | null
  success: boolean
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type UserProfile = Profile

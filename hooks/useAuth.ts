"use client"

import { useUser, useSession, useSupabaseClient } from "@supabase/auth-helpers-react"

export function useAuth() {
  const user = useUser()
  const session = useSession()
  const supabase = useSupabaseClient()

  const login = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })

  const register = (email: string, password: string) =>
    supabase.auth.signUp({ email, password })

  const logout = () => supabase.auth.signOut()

  return {
    user,
    session,
    profile: null,
    loading: false,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }
}

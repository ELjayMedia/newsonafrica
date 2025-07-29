"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: "google" | "facebook") => Promise<void>
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Initialize auth state and listen for changes
  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) throw error
    },
    [supabase],
  )

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      })
      setLoading(false)
      if (error) throw error
    },
    [supabase],
  )

  const signOut = useCallback(async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    if (error) throw error
  }, [supabase])

  const signInWithOAuth = useCallback(
    async (provider: "google" | "facebook") => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    },
    [supabase],
  )

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) return false
    setSession(data.session)
    setUser(data.session?.user ?? null)
    return true
  }, [supabase])

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

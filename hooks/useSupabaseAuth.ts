import logger from "@/utils/logger";
"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import type { User, Session, AuthError } from "@supabase/supabase-js"

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signInWithOAuth: (provider: "google" | "facebook") => Promise<void>
  clearError: () => void
}

export function useSupabaseAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Handle auth errors
  const handleAuthError = useCallback((error: AuthError | Error) => {
    logger.error("Auth error:", error)

    let errorMessage = "An unexpected error occurred"

    if ("message" in error) {
      switch (error.message) {
        case "Invalid login credentials":
          errorMessage = "Invalid email or password. Please check your credentials."
          break
        case "Email not confirmed":
          errorMessage = "Please check your email and confirm your account before signing in."
          break
        case "User not found":
          errorMessage = "No account found with this email address."
          break
        case "signup_disabled":
          errorMessage = "New user registration is currently disabled."
          break
        default:
          errorMessage = error.message
      }
    }

    setError(errorMessage)
    toast({
      title: "Authentication Error",
      description: errorMessage,
      variant: "destructive",
    })
  }, [])

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          handleAuthError(error)
          return
        }

        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        if (mounted) {
          handleAuthError(error as Error)
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      logger.info("Auth state changed:", event)

      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      setError(null)

      // Handle specific auth events
      switch (event) {
        case "SIGNED_IN":
          if (session?.user) {
            // Create or update profile
            try {
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .single()

              if (!existingProfile) {
                const username = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user"

                await supabase.from("profiles").insert({
                  id: session.user.id,
                  username,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name,
                  avatar_url: session.user.user_metadata?.avatar_url,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
              }
            } catch (profileError) {
              logger.error("Error handling profile:", profileError)
            }

            toast({
              title: "Welcome!",
              description: "You've successfully signed in.",
            })

            router.push("/")
            router.refresh()
          }
          break

        case "SIGNED_OUT":
          toast({
            title: "Signed out",
            description: "You've been successfully signed out.",
          })
          router.push("/auth")
          break
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router, handleAuthError])

  // Sign in with email and password
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })

        if (error) throw error
      } catch (error) {
        handleAuthError(error as AuthError)
      } finally {
        setLoading(false)
      }
    },
    [supabase, handleAuthError],
  )

  // Sign up with email, password, and username
  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      try {
        setLoading(true)
        setError(null)

        // Check if username already exists
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.trim())
          .single()

        if (existingUser) {
          throw new Error("Username is already taken. Please choose another.")
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              username: username.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        toast({
          title: "Account created!",
          description: "Please check your email to confirm your account.",
        })
      } catch (error) {
        handleAuthError(error as AuthError)
      } finally {
        setLoading(false)
      }
    },
    [supabase, handleAuthError],
  )

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      handleAuthError(error as AuthError)
    } finally {
      setLoading(false)
    }
  }, [supabase, handleAuthError])

  // Reset password
  const resetPassword = useCallback(
    async (email: string) => {
      try {
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        })

        if (error) throw error

        toast({
          title: "Reset email sent",
          description: "Please check your email for password reset instructions.",
        })
      } catch (error) {
        handleAuthError(error as AuthError)
      } finally {
        setLoading(false)
      }
    },
    [supabase, handleAuthError],
  )

  // Sign in with OAuth
  const signInWithOAuth = useCallback(
    async (provider: "google" | "facebook") => {
      try {
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams:
              provider === "google"
                ? {
                    access_type: "offline",
                    prompt: "consent",
                  }
                : undefined,
          },
        })

        if (error) throw error
      } catch (error) {
        handleAuthError(error as AuthError)
        setLoading(false)
      }
    },
    [supabase, handleAuthError],
  )

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    signInWithOAuth,
    clearError,
  }
}

"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface AuthError {
  message: string
  code?: string
}

function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  )
}

export function useSupabaseAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleAuthError = useCallback((error: unknown): string => {
    console.error("Auth error:", error)

    if (isAuthError(error)) {
      switch (error.message) {
        case "Invalid login credentials":
          return "Invalid email or password. Please check your credentials and try again."
        case "Email not confirmed":
          return "Please check your email and click the confirmation link before signing in."
        case "User not found":
          return "No account found with this email address."
        case "Password should be at least 6 characters":
          return "Password must be at least 6 characters long."
        case "Unable to validate email address: invalid format":
          return "Please enter a valid email address."
        case "signup_disabled":
          return "New user registration is currently disabled."
        case "Email rate limit exceeded":
          return "Too many requests. Please wait a moment before trying again."
        default:
          return error.message
      }
    }

    return "An unexpected error occurred. Please try again."
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!email || !password) {
        setError("Email and password are required")
        return { success: false }
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })

        if (signInError) {
          setError(handleAuthError(signInError))
          return { success: false }
        }

        if (data.user) {
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in.",
          })
          return { success: true, user: data.user }
        }

        return { success: false }
      } catch (error: unknown) {
        setError(handleAuthError(error))
        return { success: false }
      } finally {
        setLoading(false)
      }
    },
    [supabase, handleAuthError],
  )

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      if (!email || !password || !username) {
        setError("Email, password, and username are required")
        return { success: false }
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long")
        return { success: false }
      }

      if (username.length < 3) {
        setError("Username must be at least 3 characters long")
        return { success: false }
      }

      setLoading(true)
      setError(null)

      try {
        // Check if username already exists
        const { data: existingUser, error: checkError } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.trim())
          .single()

        if (checkError && checkError.code !== "PGRST116") {
          // Error other than "not found"
          throw checkError
        }

        if (existingUser) {
          setError("Username already exists. Please choose another username.")
          return { success: false }
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              username: username.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (signUpError) {
          setError(handleAuthError(signUpError))
          return { success: false }
        }

        if (data.user) {
          // Create user profile
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            username: username.trim(),
            email: email.trim().toLowerCase(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (profileError) {
            console.error("Error creating profile:", profileError)
            // Don't fail signup if profile creation fails
          }

          toast({
            title: "Account created!",
            description: "Please check your email to confirm your account.",
          })

          return { success: true, user: data.user }
        }

        return { success: false }
      } catch (error: unknown) {
        setError(handleAuthError(error))
        return { success: false }
      } finally {
        setLoading(false)
      }
    },
    [supabase, handleAuthError],
  )

  const resetPassword = useCallback(
    async (email: string) => {
      if (!email) {
        setError("Email address is required")
        return { success: false }
      }

      setLoading(true)
      setError(null)

      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        })

        if (resetError) {
          setError(handleAuthError(resetError))
          return { success: false }
        }

        toast({
          title: "Reset email sent!",
          description: "Please check your email for password reset instructions.",
        })

        return { success: true }
      } catch (error: unknown) {
        setError(handleAuthError(error))
        return { success: false }
      } finally {
        setLoading(false)
      }
    },
    [supabase, handleAuthError],
  )

  const signInWithOAuth = useCallback(
    async (provider: "google" | "facebook") => {
      setLoading(true)
      setError(null)

      try {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
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

        if (oauthError) {
          setError(handleAuthError(oauthError))
          return { success: false }
        }

        // OAuth redirect will happen automatically
        return { success: true }
      } catch (error: unknown) {
        setError(handleAuthError(error))
        return { success: false }
      } finally {
        setLoading(false)
      }
    },
    [supabase, handleAuthError],
  )

  const signOut = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        setError(handleAuthError(signOutError))
        return { success: false }
      }

      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      })

      router.push("/auth")
      return { success: true }
    } catch (error: unknown) {
      setError(handleAuthError(error))
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [supabase, handleAuthError, router])

  return {
    loading,
    error,
    signIn,
    signUp,
    resetPassword,
    signInWithOAuth,
    signOut,
    clearError,
  }
}

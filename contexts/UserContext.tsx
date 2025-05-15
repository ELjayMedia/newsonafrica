"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import * as AuthService from "@/services/auth-service"
import * as ProfileService from "@/services/profile-service"
import type { Profile } from "@/services/profile-service"

/**
 * User context type definition
 */
interface UserContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  resetPassword: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

/**
 * User context for authentication and profile management
 */
const UserContext = createContext<UserContextType | undefined>(undefined)

/**
 * Provider component for user authentication and profile management
 *
 * @param children - React children components
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  /**
   * Handle social login profile creation/update
   */
  const handleSocialLoginProfile = async (user: User) => {
    try {
      const existingProfile = await ProfileService.fetchProfile(user.id)
      if (!existingProfile) {
        // Create a default profile for the user
        const username = user.email?.split("@")[0] || user.id // Generate a default username
        await ProfileService.createProfile(user.id, {
          username: username,
          fullName: (user.user_metadata?.full_name as string) || "",
          avatarUrl: (user.user_metadata?.avatar_url as string) || "",
          website: (user.user_metadata?.website as string) || "",
        })
        // Refresh the profile
        await fetchProfile(user.id)
      }
    } catch (error) {
      console.error("Error handling social login profile:", error)
    }
  }

  /**
   * Fetch user profile with error handling
   */
  const fetchProfile = useCallback(async (userId: string) => {
    const profileData = await ProfileService.fetchProfile(userId)
    if (profileData) {
      setProfile(profileData)
    }
    setLoading(false)
  }, [])

  /**
   * Refresh session helper function
   */
  const refreshSession = async (): Promise<boolean> => {
    try {
      const result = await AuthService.refreshSession()

      if (!result.success) {
        // If refresh failed, clear the session
        await AuthService.signOut()
        setUser(null)
        setSession(null)
        setProfile(null)
        setIsAuthenticated(false)
        return false
      }

      setSession(result.session)
      setUser(result.user)
      setIsAuthenticated(!!result.user)

      if (result.user) {
        await fetchProfile(result.user.id)
      }

      return true
    } catch (error) {
      console.error("Error refreshing session:", error)
      return false
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session
        const { session: currentSession, user: currentUser } = await AuthService.getCurrentSession()

        setSession(currentSession)
        setUser(currentUser)
        setIsAuthenticated(!!currentUser)

        if (currentUser) {
          fetchProfile(currentUser.id)
        } else {
          setLoading(false)
        }

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("Auth state changed:", event)

          // Handle social login profile creation/update
          if (event === "SIGNED_IN" && session?.user) {
            try {
              // For social logins, ensure profile exists
              const provider = session.user.app_metadata?.provider as string
              if (provider && (provider === "facebook" || provider === "google")) {
                await handleSocialLoginProfile(session.user)
              }
            } catch (error) {
              console.error("Error handling social login profile:", error)
            }
          }

          setSession(session)
          setUser(session?.user ?? null)
          setIsAuthenticated(!!session?.user)

          if (session?.user) {
            fetchProfile(session.user.id)
          } else {
            setProfile(null)
            setLoading(false)
          }
        })

        return () => {
          authListener.subscription.unsubscribe()
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        setLoading(false)
      }
    }

    initAuth()
  }, [fetchProfile])

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      setLoading(true)
      const data = await AuthService.signInWithEmail(email, password, rememberMe)

      // Fetch user profile after successful sign-in
      if (data.user) {
        await fetchProfile(data.user.id)
      }

      return data
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign up with email, password and username
   */
  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true)
      const data = await AuthService.signUpWithEmail(email, password, username)

      // Fetch the profile after creation
      if (data.user) {
        await fetchProfile(data.user.id)
      }

      return data
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      setLoading(true)
      await AuthService.signOut()

      // Clear local state
      setUser(null)
      setSession(null)
      setProfile(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update the user profile
   */
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      setLoading(true)
      if (!user) throw new Error("User not authenticated")

      const updatedProfile = await ProfileService.updateProfile(user.id, updates)
      if (updatedProfile) {
        setProfile(updatedProfile)
      }

      return updatedProfile
    } catch (error) {
      console.error("Error updating profile:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Reset the user password
   */
  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      await AuthService.resetPassword(email)
    } catch (error) {
      console.error("Error resetting password:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      return await AuthService.signInWithSocialProvider("google")
    } catch (error) {
      console.error("Error signing in with Google:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign in with Facebook
   */
  const signInWithFacebook = async () => {
    try {
      setLoading(true)
      return await AuthService.signInWithSocialProvider("facebook")
    } catch (error) {
      console.error("Error signing in with Facebook:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        updateProfile,
        resetPassword,
        signInWithGoogle,
        signInWithFacebook,
        refreshSession,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

/**
 * Hook to access the user context
 *
 * @returns The user context
 * @throws Error if used outside of UserProvider
 */
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

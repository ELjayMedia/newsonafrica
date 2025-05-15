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
  resetPassword: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  refreshSession: () => Promise<boolean>
  syncSocialProfile: () => Promise<void>
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
   * Sync social profile data
   */
  const syncSocialProfile = async () => {
    try {
      if (!session || !user) {
        return
      }

      const provider = user.app_metadata?.provider as string
      if (!provider || (provider !== "facebook" && provider !== "google")) {
        return
      }

      const updatedProfile = await AuthService.processSocialLoginData(session)
      if (updatedProfile) {
        setProfile(updatedProfile)
      }
    } catch (error) {
      console.error("Error syncing social profile:", error)
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
        // If refresh failed but we still have a user in state,
        // we'll keep them signed in until they explicitly sign out
        if (user) {
          console.log("Session refresh failed, but keeping existing user state")
          return true
        }

        // Otherwise clear the session
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
      // Don't clear user state on refresh errors
      return !!user
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

          // If this is a social login, process the profile data
          if (
            currentSession &&
            (currentUser.app_metadata?.provider === "facebook" || currentUser.app_metadata?.provider === "google")
          ) {
            await AuthService.processSocialLoginData(currentSession)
          }
        } else {
          setLoading(false)
        }

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log("Auth state changed:", event)

          setSession(newSession)
          setUser(newSession?.user ?? null)
          setIsAuthenticated(!!newSession?.user)

          if (newSession?.user) {
            // For social logins, process profile data
            if (
              event === "SIGNED_IN" &&
              (newSession.user.app_metadata?.provider === "facebook" ||
                newSession.user.app_metadata?.provider === "google")
            ) {
              await AuthService.processSocialLoginData(newSession)
            }

            fetchProfile(newSession.user.id)
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
        syncSocialProfile,
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

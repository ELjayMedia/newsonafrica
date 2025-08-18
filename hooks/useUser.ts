import logger from "@/utils/logger";
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabaseClient } from "@/lib/api/supabase"
import type { UserProfile } from "@/lib/api/supabase"

// Hook return type
export interface UseUserReturn {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  refreshUser: () => Promise<void>
}

// Cache for user profile to avoid unnecessary API calls
const profileCache: { [userId: string]: UserProfile } = {}
const profileCacheTimestamp: { [userId: string]: number } = {}
const PROFILE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Custom hook to manage user authentication state with Supabase
 *
 * Features:
 * - Tracks current user session
 * - Subscribes to auth state changes
 * - Fetches and caches user profile
 * - Provides loading and error states
 * - Memoizes results for performance
 *
 * @returns {UseUserReturn} User state and utilities
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  /**
   * Fetch user profile with caching
   */
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // Check cache first
      const now = Date.now()
      const cachedProfile = profileCache[userId]
      const cacheTimestamp = profileCacheTimestamp[userId]

      if (cachedProfile && cacheTimestamp && now - cacheTimestamp < PROFILE_CACHE_DURATION) {
        return cachedProfile
      }

      // Fetch from Supabase
      const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        logger.error("Error fetching user profile:", error)
        return null
      }

      if (data) {
        // Update cache
        profileCache[userId] = data as UserProfile
        profileCacheTimestamp[userId] = now
        return data as UserProfile
      }

      return null
    } catch (error) {
      logger.error("Error in fetchUserProfile:", error)
      return null
    }
  }, [])

  /**
   * Handle auth state changes
   */
  const handleAuthStateChange = useCallback(
    async (event: string, newSession: Session | null) => {
      logger.info("Auth state changed:", event)

      try {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setError(null)

        if (newSession?.user) {
          // Fetch user profile
          const userProfile = await fetchUserProfile(newSession.user.id)
          setProfile(userProfile)
        } else {
          // Clear profile when user signs out
          setProfile(null)
          // Clear cache for signed out user
          if (user?.id) {
            delete profileCache[user.id]
            delete profileCacheTimestamp[user.id]
          }
        }
      } catch (error) {
        logger.error("Error handling auth state change:", error)
        setError("Failed to update user session")
      } finally {
        setLoading(false)
        setInitialLoadComplete(true)
      }
    },
    [fetchUserProfile, user?.id],
  )

  /**
   * Refresh user data manually
   */
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabaseClient.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        // Force refresh profile (bypass cache)
        const userId = currentSession.user.id
        delete profileCache[userId]
        delete profileCacheTimestamp[userId]

        const userProfile = await fetchUserProfile(userId)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
    } catch (error) {
      logger.error("Error refreshing user:", error)
      setError("Failed to refresh user data")
    } finally {
      setLoading(false)
    }
  }, [fetchUserProfile])

  /**
   * Initialize auth state and set up listener
   */
  useEffect(() => {
    let mounted = true
    let authListener: { subscription: { unsubscribe: () => void } } | null = null

    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabaseClient.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          logger.error("Error getting initial session:", sessionError)
          setError("Failed to initialize authentication")
          setLoading(false)
          return
        }

        // Set initial state
        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        // Fetch profile if user exists
        if (initialSession?.user) {
          const userProfile = await fetchUserProfile(initialSession.user.id)
          if (mounted) {
            setProfile(userProfile)
          }
        }

        // Set up auth state listener
        const { data: listener } = supabaseClient.auth.onAuthStateChange(handleAuthStateChange)
        authListener = listener

        if (mounted) {
          setLoading(false)
          setInitialLoadComplete(true)
        }
      } catch (error) {
        logger.error("Error initializing auth:", error)
        if (mounted) {
          setError("Failed to initialize authentication")
          setLoading(false)
          setInitialLoadComplete(true)
        }
      }
    }

    initializeAuth()

    // Cleanup function
    return () => {
      mounted = false
      if (authListener) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [fetchUserProfile, handleAuthStateChange])

  /**
   * Memoized return value to prevent unnecessary re-renders
   */
  const memoizedValue = useMemo(() => {
    const isAuthenticated = !!(user && session)

    return {
      user,
      profile,
      session,
      loading: loading || !initialLoadComplete,
      error,
      isAuthenticated,
      refreshUser,
    }
  }, [user, profile, session, loading, initialLoadComplete, error, refreshUser])

  return memoizedValue
}

/**
 * Hook to check if user is authenticated
 * Lightweight version that only returns authentication status
 */
export function useAuth(): { isAuthenticated: boolean; loading: boolean } {
  const { isAuthenticated, loading } = useUser()

  return useMemo(
    () => ({
      isAuthenticated,
      loading,
    }),
    [isAuthenticated, loading],
  )
}

/**
 * Hook to get user profile only
 * Useful when you only need profile data
 */
export function useUserProfile(): {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
} {
  const { profile, loading, error, refreshUser } = useUser()

  return useMemo(
    () => ({
      profile,
      loading,
      error,
      refreshProfile: refreshUser,
    }),
    [profile, loading, error, refreshUser],
  )
}

/**
 * Hook for user session management
 * Returns session-specific data and utilities
 */
export function useSession(): {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
  isValid: boolean
} {
  const { session, user, loading, error } = useUser()

  return useMemo(() => {
    const isValid = !!(session && user && session.expires_at && session.expires_at > Date.now() / 1000)

    return {
      session,
      user,
      loading,
      error,
      isValid,
    }
  }, [session, user, loading, error])
}

// Export default hook
export default useUser

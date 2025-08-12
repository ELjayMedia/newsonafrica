"use client"

import { useCallback, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

/**
 * Hook for authentication-related functionality
 * Provides simplified access to auth state and methods
 */
export function useAuth() {
  const {
    user,
    profile,
    loading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithFacebook,
    requireAuth,
  } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /**
   * Handle login with email and password
   */
  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      try {
        await signIn(email, password, rememberMe)

        // Check for returnTo parameter to redirect after login
        const returnTo = searchParams?.get("returnTo")
        if (returnTo) {
          router.push(decodeURIComponent(returnTo))
        } else {
          router.push("/profile")
        }

        return { success: true }
      } catch (error) {
        console.error("Login failed:", error)
        return { success: false, error }
      }
    },
    [signIn, router, searchParams],
  )

  /**
   * Handle registration with email, password, and username
   */
  const register = useCallback(
    async (email: string, password: string, username: string) => {
      try {
        await signUp(email, password, username)

        // Check for returnTo parameter to redirect after registration
        const returnTo = searchParams?.get("returnTo")
        if (returnTo) {
          router.push(decodeURIComponent(returnTo))
        } else {
          router.push("/")
        }

        return { success: true }
      } catch (error) {
        console.error("Registration failed:", error)
        return { success: false, error }
      }
    },
    [signUp, router, searchParams],
  )

  /**
   * Handle logout and redirect
   */
  const logout = useCallback(
    async (redirectTo = "/auth") => {
      try {
        await signOut(redirectTo)
        return { success: true }
      } catch (error) {
        console.error("Logout failed:", error)
        return { success: false, error }
      }
    },
    [signOut],
  )

  /**
   * Handle social login with Google
   */
  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithGoogle()
      return { success: true }
    } catch (error) {
      console.error("Google login failed:", error)
      return { success: false, error }
    }
  }, [signInWithGoogle])

  /**
   * Handle social login with Facebook
   */
  const loginWithFacebook = useCallback(async () => {
    try {
      await signInWithFacebook()
      return { success: true }
    } catch (error) {
      console.error("Facebook login failed:", error)
      return { success: false, error }
    }
  }, [signInWithFacebook])

  /**
   * Check if the current route requires authentication
   * Redirects to login page if not authenticated
   */
  const checkAuth = useCallback(() => {
    return requireAuth(`/auth?returnTo=${encodeURIComponent(pathname || "/")}`)
  }, [requireAuth, pathname])

  /**
   * Redirect authenticated users away from auth pages
   */
  const redirectIfAuthenticated = useCallback(() => {
    if (!loading && isAuthenticated && pathname?.startsWith("/auth")) {
      const returnTo = searchParams?.get("returnTo")
      if (returnTo) {
        router.push(decodeURIComponent(returnTo))
      } else {
        router.push("/profile")
      }
      return true
    }
    return false
  }, [loading, isAuthenticated, pathname, searchParams, router])

  // Automatically check auth on mount
  useEffect(() => {
    // Only check auth for client-side navigation
    if (typeof window !== "undefined") {
      // Don't redirect from auth pages here - that's handled by redirectIfAuthenticated
      if (!pathname?.startsWith("/auth")) {
        checkAuth()
      }
    }
  }, [checkAuth, pathname])

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithFacebook,
    checkAuth,
    redirectIfAuthenticated,
  }
}

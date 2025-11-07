"use client"

import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

import { isSupabaseConfigured, supabaseClient } from "@/lib/api/supabase"

import {
  getCurrentSession,
  refreshSession as refreshSessionAction,
  resetPassword as resetPasswordAction,
  signIn as signInAction,
  signInWithOAuth as signInWithOAuthAction,
  signOut as signOutAction,
  signUp as signUpAction,
  updateProfile as updateProfileAction,
  type AuthStatePayload,
  type Profile,
} from "@/app/actions/auth"
import type { Database } from "@/types/supabase"
import type { ActionResult } from "@/lib/supabase/action-result"

// Session refresh settings
const SESSION_REFRESH_BUFFER = 5 * 60 * 1000 // 5 minutes in milliseconds

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/auth", "/sport", "/entertainment", "/search", "/post"]

/**
 * User context type definition
 */
interface UserContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isRefreshingSession: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: (redirectTo?: string) => Promise<void>
  updateProfile: (
    updates: Partial<Database["public"]["Tables"]["profiles"]["Update"]>,
  ) => Promise<Profile>
  resetPassword: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  refreshSession: () => Promise<boolean>
  ensureSessionFreshness: () => Promise<boolean>
  requireAuth: (fallbackUrl?: string) => boolean
}

/**
 * User context for authentication and profile management
 */
const UserContext = createContext<UserContextType | undefined>(undefined)

type AuthActionResult = ActionResult<AuthStatePayload>

type OAuthProvider = "google" | "facebook"

function getSafeUrl(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).toString()
  } catch (error) {
    console.error("Invalid OAuth redirect URL", error)
    return null
  }
}

/**
 * Provider component for user authentication and profile management
 */
interface UserProviderProps {
  children: React.ReactNode
  initialState?: AuthStatePayload | null
}

export function UserProvider({ children, initialState = null }: UserProviderProps) {
  const initialSession = initialState?.session ?? null
  const initialUser = initialState?.user ?? null
  const initialProfile = initialState?.profile ?? null
  const hasInitialState = initialState !== null

  const [user, setUser] = useState<User | null>(initialUser)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialUser))
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(hasInitialState)
  const [loadingState, setLoadingState] = useState(!hasInitialState)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null)
  const pendingInitialStateRef = useRef<AuthStatePayload | null>(initialState)

  const applyAuthState = useCallback(
    async (next: AuthStatePayload | null) => {
      const nextSession = (next?.session ?? null) as Session | null
      const nextUser = (next?.user ?? null) as User | null
      const nextProfile = next?.profile ?? null

      setSession(nextSession)
      setUser(nextUser)
      setProfile(nextProfile)
      setIsAuthenticated(!!nextUser)
      if (typeof window === "undefined") {
        return
      }

      if (!isSupabaseConfigured()) {
        return
      }

      try {
        if (nextSession) {
          const accessToken = nextSession.access_token
          const refreshToken = nextSession.refresh_token

          if (!accessToken || !refreshToken) {
            console.warn("Supabase session is missing tokens; skipping client synchronization")
            return
          }

          const { error } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error("Failed to synchronize Supabase client session:", error)
          }
        } else {
          const { error } = await supabaseClient.auth.signOut()

          if (error) {
            console.error("Failed to clear Supabase client session:", error)
          }
        }
      } catch (error) {
        console.error("Unexpected error synchronizing Supabase client session:", error)
      }
    },
    [],
  )

  const handleAuthResult = useCallback(
    async (result: AuthActionResult): Promise<AuthStatePayload | null> => {
      if (result.error) {
        throw result.error
      }

      const payload = result.data ?? null
      await applyAuthState(payload)
      return payload
    },
    [applyAuthState],
  )

  useEffect(() => {
    let isMounted = true
    const hydrateFromInitialState = async () => {
      const initial = pendingInitialStateRef.current
      if (!initial) {
        return false
      }

      pendingInitialStateRef.current = null

      try {
        await applyAuthState(initial)
      } catch (error) {
        console.error("Failed to apply initial auth state:", error)
        await applyAuthState(null)
      }

      if (isMounted) {
        setLoadingState(false)
        setInitialAuthCheckComplete(true)
      }

      return true
    }

    const fetchSession = () => {
      setLoadingState(true)

      startTransition(() => {
        getCurrentSession()
          .then(async (result) => {
            if (!isMounted) return
            try {
              await handleAuthResult(result)
            } catch (error) {
              console.error("Error getting current session:", error)
              await applyAuthState(null)
            }
          })
          .catch(async (error) => {
            if (!isMounted) return
            console.error("Unexpected error loading session:", error)
            await applyAuthState(null)
          })
          .finally(() => {
            if (!isMounted) return
            setLoadingState(false)
            setInitialAuthCheckComplete(true)
          })
      })
    }

    hydrateFromInitialState()
      .then((hydrated) => {
        if (!hydrated) {
          fetchSession()
        }
      })
      .catch((error) => {
        console.error("Failed to hydrate initial auth state:", error)
        fetchSession()
      })

    return () => {
      isMounted = false
    }
  }, [applyAuthState, handleAuthResult, startTransition])

  const sessionExpiresSoon = useCallback(() => {
    if (!session?.expires_at) return false

    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now

    return timeUntilExpiry <= SESSION_REFRESH_BUFFER
  }, [session])

  const refreshSession = useCallback((): Promise<boolean> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    setIsRefreshingSession(true)

    const refreshPromise = new Promise<boolean>((resolve) => {
      startTransition(() => {
        refreshSessionAction()
          .then(async (result) => {
            try {
              await handleAuthResult(result)
              router.refresh()
              resolve(true)
            } catch (error) {
              console.error("Failed to refresh session:", error)
              if (!user) {
                await applyAuthState(null)
              }
              resolve(!!user)
            }
          })
          .catch((error) => {
            console.error("Unexpected error refreshing session:", error)
            resolve(!!user)
          })
          .finally(() => {
            setIsRefreshingSession(false)
            refreshPromiseRef.current = null
          })
      })
    })

    refreshPromiseRef.current = refreshPromise
    return refreshPromise
  }, [applyAuthState, handleAuthResult, router, startTransition, user])

  const ensureSessionFreshness = useCallback(async () => {
    if (!session) {
      return true
    }

    if (!sessionExpiresSoon()) {
      return true
    }

    return refreshSession()
  }, [refreshSession, session, sessionExpiresSoon])

  const runAuthAction = useCallback(
    (
      action: () => Promise<ActionResult<AuthStatePayload>>,
      { shouldRefreshRouter = true }: { shouldRefreshRouter?: boolean } = {},
    ) => {
      setLoadingState(true)

      return new Promise<AuthStatePayload | null>((resolve, reject) => {
        startTransition(() => {
          action()
            .then(async (result) => {
              try {
                const payload = await handleAuthResult(result)

                if (shouldRefreshRouter) {
                  router.refresh()
                }

                resolve(payload)
              } catch (error) {
                reject(error)
              }
            })
            .catch(reject)
            .finally(() => {
              setLoadingState(false)
            })
        })
      })
    },
    [handleAuthResult, router, startTransition],
  )

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      await runAuthAction(() => signInAction({ email, password }))
    },
    [runAuthAction],
  )

  /**
   * Sign up with email, password and username
   */
  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      await runAuthAction(() => signUpAction({ email, password, username }))
    },
    [runAuthAction],
  )

  /**
   * Sign out the current user
   */
  const signOut = useCallback(
    async (redirectTo = "/auth") => {
      setLoadingState(true)

      return new Promise<void>((resolve, reject) => {
        startTransition(() => {
          signOutAction()
            .then(async (result) => {
              if (result.error) {
                reject(result.error)
                return
              }

              await applyAuthState(null)
              router.refresh()

              if (redirectTo) {
                router.push(redirectTo)
              }

              resolve()
            })
            .catch(reject)
            .finally(() => {
              setLoadingState(false)
            })
        })
      })
    },
    [applyAuthState, router, startTransition],
  )

  /**
   * Update the user profile
   */
  const updateProfile = useCallback(
    async (updates: Partial<Database["public"]["Tables"]["profiles"]["Update"]>) => {
      setLoadingState(true)

      return new Promise<Profile>((resolve, reject) => {
        startTransition(() => {
          updateProfileAction(updates)
            .then((result) => {
              if (result.error || !result.data) {
                reject(result.error ?? new Error("Failed to update profile"))
                return
              }

              const nextProfile = result.data
              setProfile(nextProfile)
              router.refresh()
              resolve(nextProfile)
            })
            .catch(reject)
            .finally(() => {
              setLoadingState(false)
            })
        })
      })
    },
    [router, startTransition],
  )

  /**
   * Reset the user password
   */
  const resetPassword = useCallback(
    async (email: string) => {
      setLoadingState(true)

      return new Promise<void>((resolve, reject) => {
        startTransition(() => {
          resetPasswordAction(email)
            .then((result) => {
              if (result.error) {
                reject(result.error)
                return
              }

              resolve()
            })
            .catch(reject)
            .finally(() => {
              setLoadingState(false)
            })
        })
      })
    },
    [startTransition],
  )

  const startOAuthSignIn = useCallback(
    async (provider: OAuthProvider) => {
      setLoadingState(true)

      return new Promise<void>((resolve, reject) => {
        startTransition(() => {
          signInWithOAuthAction({ provider })
            .then((result) => {
              if (result.error) {
                reject(result.error)
                return
              }

              const redirectUrl = getSafeUrl(result.data?.url ?? null)
              if (redirectUrl && typeof window !== "undefined") {
                window.location.assign(redirectUrl)
              }

              resolve()
            })
            .catch(reject)
            .finally(() => {
              setLoadingState(false)
            })
        })
      })
    },
    [startTransition],
  )

  /**
   * Sign in with Google
   */
  const signInWithGoogle = useCallback(async () => {
    await startOAuthSignIn("google")
  }, [startOAuthSignIn])

  /**
   * Sign in with Facebook
   */
  const signInWithFacebook = useCallback(async () => {
    await startOAuthSignIn("facebook")
  }, [startOAuthSignIn])

  /**
   * Check if the current route requires authentication
   */
  const requireAuth = useCallback(
    (fallbackUrl = "/auth"): boolean => {
      const isLoading = loadingState || isRefreshingSession || !initialAuthCheckComplete

      // Don't check during initial loading
      if (isLoading) return true

      // If authenticated, allow access
      if (isAuthenticated) return true

      // If this is a public route, allow access
      const pathname = typeof window !== "undefined" ? window.location.pathname : null
      if (pathname && PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) return true

      // Otherwise redirect to auth page with return URL
      if (typeof window !== "undefined") {
        const returnUrl = encodeURIComponent(pathname || "/")
        router.push(`${fallbackUrl}?returnTo=${returnUrl}`)
      }
      return false
    },
    [initialAuthCheckComplete, isAuthenticated, isRefreshingSession, loadingState, router],
  )

  const loading = useMemo(
    () => loadingState || (isAuthenticated && isRefreshingSession) || isPending,
    [isAuthenticated, isPending, isRefreshingSession, loadingState],
  )

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isRefreshingSession,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        updateProfile,
        resetPassword,
        signInWithGoogle,
        signInWithFacebook,
        refreshSession,
        ensureSessionFreshness,
        requireAuth,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

/**
 * Hook to access the user context
 */
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

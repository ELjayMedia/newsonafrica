"use client"

import { useMemo } from "react"
import { useUser as useUserContext } from "@/contexts/UserContext"

export function useAuth() {
  const {
    user,
    session,
    profile,
    loading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
  } = useUserContext()

  const defaultUsername = useMemo(() => {
    if (!user?.email) return ""
    return user.email.split("@")[0] || user.email
  }, [user?.email])

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated,
    login: (email: string, password: string) => signIn(email, password),
    register: (email: string, password: string) =>
      signUp(email, password, email.split("@")[0] || defaultUsername || email),
    logout: () => signOut(),
  }
}

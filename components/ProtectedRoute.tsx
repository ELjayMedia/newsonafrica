"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

interface ProtectedRouteProps {
  children: React.ReactNode
  fallbackUrl?: string
}

export function ProtectedRoute({ children, fallbackUrl = "/auth" }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect after initial loading is complete
    if (!loading && !isAuthenticated) {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
      router.push(`${fallbackUrl}?returnTo=${returnTo}`)
    }
  }, [isAuthenticated, loading, router, fallbackUrl])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null
  }

  // Show children if authenticated
  return <>{children}</>
}

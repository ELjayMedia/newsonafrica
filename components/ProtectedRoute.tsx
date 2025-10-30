"use client"

import type React from "react"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
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
      <div
        className="flex min-h-screen flex-col items-center justify-center text-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-10 w-10 text-blue-600" aria-hidden="true" />
        <p className="mt-4 text-sm text-gray-600">Checking your session…</p>
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

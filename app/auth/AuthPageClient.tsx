"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { AuthForm } from "@/components/AuthForm"

export default function AuthPageClient({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string }
}) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const [returnTo, setReturnTo] = useState<string | null>(null)

  useEffect(() => {
    // Get returnTo from URL params
    const returnToParam = params?.get("returnTo") || searchParams.redirectTo || null
    setReturnTo(returnToParam)

    // Redirect authenticated users to profile or returnTo
    if (!loading && isAuthenticated) {
      if (returnToParam) {
        router.push(decodeURIComponent(returnToParam))
      } else {
        router.push("/profile")
      }
    }
  }, [isAuthenticated, loading, router, params, searchParams.redirectTo])

  // Show nothing while loading or redirecting
  if (loading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In to News On Africa</h1>
        {searchParams.error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {searchParams.error === "OAuthSignin" && "Error during OAuth sign in. Please try again."}
            {searchParams.error === "OAuthCallback" && "Error during OAuth callback. Please try again."}
            {searchParams.error === "OAuthCreateAccount" && "Error creating OAuth account. Please try again."}
            {searchParams.error === "EmailCreateAccount" && "Error creating email account. Please try again."}
            {searchParams.error === "Callback" && "Error during callback. Please try again."}
            {searchParams.error === "OAuthAccountNotLinked" &&
              "Email already in use with different provider. Please sign in using original provider."}
            {searchParams.error === "EmailSignin" && "Error during email sign in. Please check your email."}
            {searchParams.error === "CredentialsSignin" && "Invalid credentials. Please try again."}
            {searchParams.error === "SessionRequired" && "Please sign in to access this page."}
            {searchParams.error === "Default" && "An error occurred. Please try again."}
          </div>
        )}
        <AuthForm returnTo={returnTo} />
      </div>
    </div>
  )
}

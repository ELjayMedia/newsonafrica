"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { AuthForm } from "@/components/AuthForm"
import { Loader } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AuthPageClient({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string }
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true)
        const { data } = await supabase.auth.getSession()

        if (data.session) {
          setIsAuthenticated(true)
          setUserEmail(data.session.user.email)

          // Handle special "back" redirection
          if (searchParams.redirectTo === "back") {
            router.back()
            return
          }

          // Set a short delay before redirecting to show the success message
          const redirectTo = searchParams.redirectTo || "/profile"
          setTimeout(() => router.replace(redirectTo), 1000)
        }
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [router, searchParams.redirectTo, supabase.auth])

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md flex flex-col items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Checking authentication status...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md flex flex-col items-center justify-center">
        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">You're already logged in</h1>
        <p className="text-gray-600 mb-6 text-center">You're currently logged in as {userEmail}</p>
        <div className="flex gap-4">
          <Button onClick={() => router.push("/profile")}>Go to Profile</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Welcome to News On Africa</h1>
      {searchParams.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {searchParams.error === "OAuthSignUp"
            ? "Email already in use with a different provider. Please use the same sign-in method you used previously."
            : searchParams.error}
        </div>
      )}
      <AuthForm redirectTo={searchParams.redirectTo} />
    </div>
  )
}

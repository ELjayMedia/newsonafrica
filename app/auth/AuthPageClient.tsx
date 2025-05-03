"use client"

import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { AuthForm } from "@/components/AuthForm"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle } from "lucide-react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { MobileProfileMenu } from "@/components/MobileProfileMenu"

// Update the redirectTo handling to support "back" navigation
export default function AuthPageClient({
  searchParams,
}: {
  searchParams: { redirectTo?: string }
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    const getSession = async () => {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        setIsAuthenticated(true)
        setUserEmail(session.user.email)

        // Handle special "back" redirection
        if (searchParams.redirectTo === "back") {
          // We can't access browser history on the server, so we'll use client-side redirection
          router.back()
          return
        }

        // On mobile, if redirecting to profile, don't auto-redirect
        // This allows the MobileProfileMenu to be shown
        if (!(isMobile && searchParams.redirectTo === "/profile")) {
          // Set a short delay before redirecting to show the success message
          setTimeout(() => {
            // Redirect to the original URL or profile page
            const redirectTo = searchParams.redirectTo || "/profile"
            router.replace(redirectTo)
          }, 1500)
        }
      }

      setLoading(false)
    }

    getSession()
  }, [router, searchParams.redirectTo, supabase.auth, isMobile])

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Checking authentication status...</p>
      </div>
    )
  }

  // If authenticated and on mobile with profile redirect, show the mobile profile menu
  if (isAuthenticated && isMobile && searchParams.redirectTo === "/profile") {
    return <MobileProfileMenu />
  }

  if (isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md flex flex-col items-center justify-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
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
      <AuthForm redirectTo={searchParams.redirectTo} />
    </div>
  )
}

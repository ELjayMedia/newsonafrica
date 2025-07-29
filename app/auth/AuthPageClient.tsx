"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, Info } from "lucide-react"
import { AuthForm } from "@/components/AuthForm"
import { useUser } from "@/contexts/UserContext"
import { toast } from "@/hooks/use-toast"

interface AuthPageClientProps {
  searchParams: { redirectTo?: string; error?: string; message?: string }
}

function AuthPageContent({ searchParams }: AuthPageClientProps) {
  const router = useRouter()
  const urlSearchParams = useSearchParams()
  const { user, loading: authLoading } = useUser()

  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  // Handle URL parameters and auth state
  useEffect(() => {
    const error = searchParams.error || urlSearchParams.get("error")
    const message = searchParams.message || urlSearchParams.get("message")
    const code = urlSearchParams.get("code")

    // Handle OAuth callback errors
    if (error) {
      switch (error) {
        case "access_denied":
          setAuthError("Authentication was cancelled. Please try again.")
          break
        case "callback_error":
          setAuthError("There was an error during authentication. Please try again.")
          break
        case "session_error":
          setAuthError("Session could not be established. Please try signing in again.")
          break
        case "no_code":
          setAuthError("Authentication failed. Please try again.")
          break
        default:
          setAuthError("An authentication error occurred. Please try again.")
      }
    }

    // Handle success messages
    if (message) {
      switch (message) {
        case "email_confirmed":
          setAuthMessage("Your email has been confirmed! You can now sign in.")
          toast({
            title: "Email Confirmed",
            description: "Your account is now active. Please sign in.",
          })
          break
        case "password_updated":
          setAuthMessage("Your password has been updated successfully!")
          toast({
            title: "Password Updated",
            description: "You can now sign in with your new password.",
          })
          break
        default:
          setAuthMessage(message)
      }
    }

    // Handle OAuth callback with code
    if (code && !error) {
      setAuthMessage("Processing authentication...")
      // The auth context will handle the code exchange
    }

    setIsLoading(false)
  }, [searchParams, urlSearchParams])

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && user) {
      const redirectTo = searchParams.redirectTo || urlSearchParams.get("redirectTo") || "/"

      toast({
        title: "Welcome back!",
        description: "You're now signed in.",
      })

      // Small delay to show the toast
      setTimeout(() => {
        if (redirectTo === "back") {
          router.back()
        } else {
          router.push(redirectTo)
        }
      }, 1000)
    }
  }, [user, authLoading, router, searchParams, urlSearchParams])

  // Handle successful authentication
  const handleAuthSuccess = () => {
    const redirectTo = searchParams.redirectTo || urlSearchParams.get("redirectTo") || "/"

    toast({
      title: "Welcome!",
      description: "You've successfully signed in.",
    })

    setTimeout(() => {
      if (redirectTo === "back") {
        router.back()
      } else {
        router.push(redirectTo)
      }
    }, 1000)
  }

  // Show loading state while checking auth
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show success state for authenticated users
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CheckCircle className="h-8 w-8 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome back!</h2>
            <p className="text-gray-600 text-center mb-4">You're signed in as {user.email}</p>
            <p className="text-sm text-gray-500">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome to News on Africa</CardTitle>
          <CardDescription className="text-gray-600">
            Sign in to your account or create a new one to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show error messages */}
          {authError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          {/* Show success messages */}
          {authMessage && !authError && (
            <Alert className="border-green-200 bg-green-50">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{authMessage}</AlertDescription>
            </Alert>
          )}

          {/* Auth Form */}
          <AuthForm
            redirectTo={searchParams.redirectTo}
            onAuthSuccess={handleAuthSuccess}
            defaultTab="signin"
            inModal={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthPageClient({ searchParams }: AuthPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthPageContent searchParams={searchParams} />
    </Suspense>
  )
}

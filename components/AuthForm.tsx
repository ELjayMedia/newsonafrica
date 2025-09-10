"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, AlertCircle, Info, WifiOff, AlertTriangle, Ban } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthErrorCategory, type AuthError, parseAuthError } from "@/utils/auth-error-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AuthFormProps {
  redirectTo?: string
  onAuthSuccess?: () => void
  defaultTab?: "signin" | "signup"
  inModal?: boolean
  onComplete?: () => void
}

export function AuthForm({
  redirectTo,
  onAuthSuccess,
  defaultTab = "signin",
  inModal = false,
  onComplete,
}: AuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const onSuccess = useCallback(() => {
    if (onComplete) {
      onComplete()
      return
    }

    const redirectParam = searchParams.get("redirectTo")
    if (redirectParam === "back") {
      router.back()
    } else if (redirectParam) {
      // Check if the redirect URL has a hash
      const hasHash = redirectParam.includes("#")
      if (hasHash) {
        router.push(redirectParam)
      } else {
        // Preserve any hash from the current URL if the redirect doesn't have one
        const currentHash = window.location.hash
        router.push(redirectParam + (currentHash || ""))
      }
    } else if (redirectTo) {
      router.push(redirectTo)
    } else {
      router.push("/")
    }
  }, [router, searchParams, redirectTo, onComplete])

  // Add this useEffect after the existing state declarations
  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        toast({
          title: "Welcome!",
          description: "You've successfully signed in.",
        })

        // Call success callback if provided
        if (onAuthSuccess) {
          onAuthSuccess()
        }

        // Redirect after successful auth
        onSuccess()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, onAuthSuccess, onSuccess])

  // Handle sign in with email
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Success handling is now done in onAuthStateChange listener
    } catch (error: any) {
      const parsedError = "category" in error ? error : parseAuthError(error)
      setError(parsedError)
      setIsLoading(false) // Only set loading false on error
    }
  }

  // Handle sign up with email
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation (keep existing validation code)
    if (password !== confirmPassword) {
      setError({
        message: "Passwords do not match",
        category: AuthErrorCategory.VALIDATION,
        suggestion: "Please ensure both passwords are identical.",
      })
      return
    }

    if (password.length < 6) {
      setError({
        message: "Password must be at least 6 characters",
        category: AuthErrorCategory.VALIDATION,
        suggestion: "Choose a stronger password with at least 6 characters.",
      })
      return
    }

    if (!username || username.length < 3) {
      setError({
        message: "Username must be at least 3 characters",
        category: AuthErrorCategory.VALIDATION,
        suggestion: "Please choose a username with at least 3 characters.",
      })
      return
    }

    setIsLoading(true)

    try {
      // Check if username already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle()

      if (checkError) throw checkError
      if (existingUsers) {
        setError({
          message: "Username already exists. Please choose another username.",
          category: AuthErrorCategory.VALIDATION,
          suggestion: "Try a different username that is unique.",
        })
        setIsLoading(false)
        return
      }

      // Create the user with username in metadata
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      toast({
        title: "Account created!",
        description: "Please check your email to confirm your account.",
      })

      // Success handling is now done in onAuthStateChange listener
    } catch (error: any) {
      const parsedError = "category" in error ? error : parseAuthError(error)
      setError(parsedError)
      setIsLoading(false) // Only set loading false on error
    }
  }

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError({
        message: "Please enter your email address to reset your password.",
        category: AuthErrorCategory.VALIDATION,
        suggestion: "Enter the email address associated with your account.",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (error) throw error

      setResetSent(true)
      setError(null)
    } catch (error: any) {
      const parsedError = "category" in error ? error : parseAuthError(error)
      setError(parsedError)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle social sign in
  const handleSocialSignIn = async (provider: "google" | "facebook") => {
    setError(null)
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams:
            provider === "google"
              ? {
                  access_type: "offline",
                  prompt: "consent",
                }
              : undefined,
        },
      })

      if (error) throw error
    } catch (error: any) {
      const parsedError = "category" in error ? error : parseAuthError(error)
      setError(parsedError)
      setIsLoading(false)
    }
  }

  // Render error message with appropriate icon based on category
  const renderErrorAlert = () => {
    if (!error) return null

    let icon
    switch (error.category) {
      case AuthErrorCategory.CREDENTIALS:
        icon = <Info className="h-4 w-4" />
        break
      case AuthErrorCategory.NETWORK:
        icon = <WifiOff className="h-4 w-4" />
        break
      case AuthErrorCategory.VALIDATION:
        icon = <AlertTriangle className="h-4 w-4" />
        break
      case AuthErrorCategory.RATE_LIMIT:
        icon = <Ban className="h-4 w-4" />
        break
      default:
        icon = <AlertCircle className="h-4 w-4" />
    }

    return (
      <Alert variant="destructive" className="mb-4">
        <div className="flex items-start">
          {icon}
          <div className="ml-2">
            <AlertTitle>{error.message}</AlertTitle>
            {error.suggestion && <AlertDescription>{error.suggestion}</AlertDescription>}
          </div>
        </div>
      </Alert>
    )
  }

  // Reset password form
  if (isResetMode) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          className="mb-4 px-0 flex items-center text-blue-600"
          onClick={() => setIsResetMode(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to sign in
        </Button>

        {renderErrorAlert()}

        {resetSent && (
          <Alert className="bg-green-50 border-green-200 text-green-600">
            <div className="flex items-center">
              <Info className="h-4 w-4" />
              <AlertTitle className="ml-2">Password reset email sent. Please check your inbox.</AlertTitle>
            </div>
          </Alert>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Enter your email address"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">We'll send you a link to reset your password.</p>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </div>
    )
  }

  // Main auth form
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      {renderErrorAlert()}

      <TabsContent value="signin">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
              Remember me for 30 days
            </Label>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 bg-transparent"
              onClick={() => handleSocialSignIn("google")}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path
                    fill="#4285F4"
                    d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                  />
                </g>
              </svg>
              <span className="sr-only md:not-sr-only md:text-xs">Google</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 bg-transparent"
              onClick={() => handleSocialSignIn("facebook")}
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" />
              </svg>
              <span className="sr-only md:not-sr-only md:text-xs">Facebook</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="link"
            className="w-full text-blue-600"
            onClick={() => setIsResetMode(true)}
            disabled={isLoading}
          >
            Forgot password?
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup">
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              minLength={3}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Username must be at least 3 characters</p>
          </div>
          <div>
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing Up...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 bg-transparent"
              onClick={() => handleSocialSignIn("google")}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path
                    fill="#4285F4"
                    d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                  />
                </g>
              </svg>
              <span className="sr-only md:not-sr-only md:text-xs">Google</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 bg-transparent"
              onClick={() => handleSocialSignIn("facebook")}
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" />
              </svg>
              <span className="sr-only md:not-sr-only md:text-xs">Facebook</span>
            </Button>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  )
}

// Export as named export
export default AuthForm

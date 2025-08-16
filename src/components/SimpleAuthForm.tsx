"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth"

interface SimpleAuthFormProps {
  defaultTab?: "signin" | "signup"
}

export function SimpleAuthForm({ defaultTab = "signin" }: SimpleAuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isResetMode, setIsResetMode] = useState(false)

  const { loading, error, signIn, signUp, resetPassword, signInWithOAuth, clearError } = useSupabaseAuth()

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await signIn(email, password)
  }

  // Handle sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    // Client-side validation
    if (password !== confirmPassword) {
      return // Error will be shown by the hook
    }

    if (password.length < 6) {
      return // Error will be shown by the hook
    }

    if (!username || username.length < 3) {
      return // Error will be shown by the hook
    }

    await signUp(email, password, username)
  }

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email) {
      return // Error will be shown by the hook
    }

    await resetPassword(email)
    setIsResetMode(false)
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
          ← Back to sign in
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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
              disabled={loading}
              placeholder="Enter your email address"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
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
    <Tabs defaultValue={defaultTab} className="w-full mx-4">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
              disabled={loading}
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
              disabled={loading}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
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
            <Button type="button" variant="outline" onClick={() => signInWithOAuth("google")} disabled={loading}>
              Google
            </Button>
            <Button type="button" variant="outline" onClick={() => signInWithOAuth("facebook")} disabled={loading}>
              Facebook
            </Button>
          </div>

          <Button
            type="button"
            variant="link"
            className="w-full text-blue-600"
            onClick={() => setIsResetMode(true)}
            disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
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
            <Button type="button" variant="outline" onClick={() => signInWithOAuth("google")} disabled={loading}>
              Google
            </Button>
            <Button type="button" variant="outline" onClick={() => signInWithOAuth("facebook")} disabled={loading}>
              Facebook
            </Button>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  )
}

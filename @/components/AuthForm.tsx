"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface AuthFormProps {
  redirectTo?: string
}

export function AuthForm({ redirectTo }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn, signUp, resetPassword } = useUser()
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await signIn(email, password)
      // Show success message
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      })
      // Redirect to the original URL or homepage
      router.push(redirectTo || "/")
    } catch (error) {
      console.error("Sign in error:", error)
      setError(
        error instanceof Error ? error.message : "Authentication failed. Please check your credentials and try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (!username || username.length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    setIsLoading(true)

    try {
      await signUp(email, password, username)
      // Show success message
      toast({
        title: "Account created!",
        description: "Your account has been successfully created. Welcome to News On Africa!",
      })
      // Redirect to homepage after successful signup
      router.push(redirectTo || "/")
    } catch (error) {
      console.error("Sign up error:", error)
      if (error instanceof Error) {
        if (error.message.includes("duplicate key")) {
          setError("Username or email already exists")
        } else if (error.message.includes("Username already exists")) {
          setError("Username already exists. Please choose another username.")
        } else if (error.message.includes("User already registered")) {
          setError("Email already registered. Please use a different email or try signing in.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Registration failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Please enter your email address to reset your password.")
      return
    }

    setIsLoading(true)

    try {
      await resetPassword(email)
      setResetSent(true)
    } catch (error) {
      console.error("Password reset error:", error)
      setError("Failed to send password reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {resetSent && (
        <Alert className="mb-4">
          <AlertDescription>Password reset email sent. Please check your inbox.</AlertDescription>
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
              disabled={isLoading}
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
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={handlePasswordReset} disabled={isLoading}>
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
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing Up...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}

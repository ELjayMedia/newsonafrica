"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

interface ResetPasswordClientProps {
  resetKey: string
}

export default function ResetPasswordClient({ resetKey }: ResetPasswordClientProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verify the reset token is valid
    const verifyToken = async () => {
      try {
        // This just checks if the token format is valid, not if it's expired
        if (!resetKey || resetKey.length < 10) {
          setIsValidToken(false)
          setError("Invalid password reset link. Please request a new one.")
          return
        }

        setIsValidToken(true)
      } catch (error) {
        console.error("Error verifying reset token:", error)
        setIsValidToken(false)
        setError("Invalid password reset link. Please request a new one.")
      }
    }

    verifyToken()
  }, [resetKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        throw error
      }

      setIsSuccess(true)
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      })
    } catch (error) {
      console.error("Error resetting password:", error)
      setError(
        error instanceof Error
          ? error.message
          : "Failed to reset password. Please try again or request a new reset link.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center">
          <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800 hover:underline">
            Request a new password reset link
          </Link>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="text-2xl font-bold">Password reset successful</h2>
        <p className="text-gray-600">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Button onClick={() => router.push("/auth")} className="mt-4">
          Go to Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Reset your password</h2>
        <p className="mt-2 text-gray-600">Enter your new password below.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
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
          <Label htmlFor="confirm-password">Confirm New Password</Label>
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
              Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/auth"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useUser } from "@/contexts/UserContext"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { resetPassword } = useUser()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await resetPassword(email)
      setIsSubmitted(true)
      toast({
        title: "Reset email sent",
        description: "Check your email for a link to reset your password.",
      })
    } catch (error) {
      console.error("Password reset error:", error)
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send reset email. Please check your email address and try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="mt-2 text-gray-600">
            We've sent a password reset link to <span className="font-medium">{email}</span>
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            If you don't see the email, check other places it might be, like your junk, spam, social, or other folders.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsSubmitted(false)
              setEmail("")
            }}
          >
            Use a different email
          </Button>
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Reset your password</h2>
        <p className="mt-2 text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter your email address"
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            "Send reset link"
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

"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useToast } from "@/hooks/use-toast"

export function LostPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/lost-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to send reset link")
      }

      setSuccess(true)
      toast({
        title: "Reset link sent",
        description: "Check your email for the password reset link",
      })
    } catch (error) {
      console.error("Lost password error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset link",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>

      {success ? (
        <div className="text-center p-4 bg-green-50 rounded-md">
          <p className="text-green-700 mb-2">Password reset link sent!</p>
          <p className="text-sm text-gray-600">Please check your email for instructions to reset your password.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full"
            />
          </div>

          <Button type="submit" className={`w-full ${isMobile ? "py-3" : "py-2"}`} disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>

          <p className="text-sm text-center text-gray-600 mt-4">
            Remember your password?{" "}
            <a href="/auth" className="text-blue-600 hover:underline">
              Sign in
            </a>
          </p>
        </form>
      )}
    </div>
  )
}

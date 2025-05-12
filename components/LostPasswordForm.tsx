"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import Image from "next/image"

export function LostPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/lost-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Password reset request failed")
      }

      setSuccessMessage("Check your email for the confirmation link.")
      setEmail("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center mb-6">
        <Image
          src="https://sjc.microlink.io/EGIGWUGCsspaGZT7vB38DeVeLCEqQ3PrYnFQQtDY8_NlqzLfaU7r_r6RZUHqgPuNn_mQYtipBPpK8Qgz3gCgjg.jpeg"
          alt="News On Africa"
          width={200}
          height={80}
          priority
        />
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Please enter your username or email address. You will receive a link to create a new password via email.
      </p>

      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Username or Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}

      <Button type="submit" className="w-full" variant="primary" disabled={isLoading}>
        {isLoading ? "Sending..." : "Get New Password"}
      </Button>

      <div className="mt-6 text-center space-y-4">
        <Link href="/auth" className="text-[#2271b1] hover:underline text-sm block">
          Log In
        </Link>
        <Link href="/" className="text-[#2271b1] hover:underline text-sm block">
          ← Go to News On Africa
        </Link>
      </div>
    </form>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resetPassword } from "@/lib/auth"

interface ResetPasswordFormProps {
  resetKey: string
}

export function ResetPasswordForm({ resetKey }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    try {
      await resetPassword(resetKey, password)
      setSuccess(true)
      setTimeout(() => {
        router.push("/auth")
      }, 3000)
    } catch (err) {
      setError("Failed to reset password. Please try again.")
    }
  }

  if (success) {
    return <p>Password reset successfully. Redirecting to login page...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New Password
        </label>
        <Input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm New Password
        </label>
        <Input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <Button type="submit" className="w-full">
        Reset Password
      </Button>
    </form>
  )
}

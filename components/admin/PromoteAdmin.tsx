"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export function PromoteAdmin() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch("/api/admin/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to promote user")
      }

      toast({
        title: "Success",
        description: data.message || "User promoted to admin successfully",
      })

      setEmail("")
    } catch (error: any) {
      console.error("Error promoting user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to promote user",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow mt-6">
      <h2 className="text-xl font-bold mb-4">Promote User to Admin</h2>
      <p className="mb-4 text-gray-600">Grant admin privileges to another user by their email address.</p>
      <form onSubmit={handlePromote} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            User Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
        </div>
        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
          {isLoading ? "Promoting..." : "Promote to Admin"}
        </Button>
      </form>
    </div>
  )
}

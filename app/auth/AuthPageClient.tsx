"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { AuthContent } from "@/components/AuthContent"
import { createClient } from "@/utils/supabase/client"

export default function AuthPageClient({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string }
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { signIn, signUp, signInWithGoogle, signInWithFacebook, isAuthenticated } = useUser()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        // User is already logged in, redirect
        if (searchParams.redirectTo) {
          router.push(searchParams.redirectTo)
        } else {
          router.push("/")
        }
      }
    }

    checkUser()
  }, [router, searchParams.redirectTo, supabase.auth])

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }

    // Check for errors from OAuth redirects
    const errorParam = searchParams?.error
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [isAuthenticated, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === "signin") {
        await signIn(email, password)
        // Router automatically redirects on successful login due to useEffect
      } else {
        await signUp(email, password, username)
        setSuccessMessage("Account created successfully! You can now sign in.")
        setMode("signin")
      }
    } catch (error) {
      console.error("Auth error:", error)
      setError(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSocialSignIn = async (provider: "google" | "facebook") => {
    setError(null)
    try {
      if (provider === "google") {
        await signInWithGoogle()
      } else {
        await signInWithFacebook()
      }
    } catch (error) {
      console.error(`${provider} sign in error:`, error)
      setError(error instanceof Error ? error.message : `${provider} sign in failed`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto">
        <AuthContent />
      </div>
    </div>
  )
}

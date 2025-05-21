"use client"

import { useSearchParams } from "next/navigation"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { AuthForm } from "@/components/AuthForm"
import { createClient } from "@/utils/supabase/client"

export default function AuthPageClient() {
  const searchParams = useSearchParams()
  const [defaultTab, setDefaultTab] = useState<"signin" | "signup">("signin")
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
    const tab = searchParams.get("tab")
    if (tab === "signin" || tab === "signup") {
      setDefaultTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        // User is already logged in, redirect
        if (searchParams.get("redirectTo")) {
          router.push(searchParams.get("redirectTo")!)
        } else {
          router.push("/")
        }
      }
    }

    checkUser()
  }, [router, searchParams, supabase.auth])

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }

    // Check for errors from OAuth redirects
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [isAuthenticated, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (defaultTab === "signin") {
        await signIn(email, password)
        // Router automatically redirects on successful login due to useEffect
      } else {
        await signUp(email, password, username)
        setSuccessMessage("Account created successfully! You can now sign in.")
        setDefaultTab("signin")
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
    <div className="container max-w-md mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          {defaultTab === "signin" ? "Sign In" : "Create Account"}
        </h1>
        <AuthForm defaultTab={defaultTab} />
      </div>
    </div>
  )
}

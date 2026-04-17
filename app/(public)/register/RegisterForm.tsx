"use client"

import type React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/UserContext"
import { cn } from "@/lib/utils"

interface RegisterFormProps {
  redirectTo?: string
}

export default function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter()
  const { signUp } = useUser()

  const sanitizedRedirect = useMemo(() => {
    if (!redirectTo) return "/"
    return redirectTo.startsWith("/") ? redirectTo : "/"
  }, [redirectTo])

  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const checkPasswordMatch = useCallback(() => {
    const pw = passwordRef.current?.value ?? ""
    const confirm = confirmRef.current?.value ?? ""
    setPasswordMismatch(confirm.length > 0 && pw !== confirm)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(null)
      const data = new FormData(e.currentTarget)
      const email = (data.get("email") as string).trim().toLowerCase()
      const username = (data.get("username") as string).trim().toLowerCase()
      const password = (data.get("password") as string).trim()
      const confirmPassword = (data.get("confirmPassword") as string).trim()

      if (!email) { setError("Email is required."); return }
      if (!username) { setError("Username is required."); return }
      if (!password) { setError("Password is required."); return }
      if (password !== confirmPassword) { setError("Passwords do not match."); return }

      setIsPending(true)
      try {
        const payload = await signUp(email, password, username)
        if (payload?.session) {
          router.push(sanitizedRedirect)
        } else {
          setSuccessMessage("We've sent a confirmation link to your email.")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign up failed.")
      } finally {
        setIsPending(false)
      }
    },
    [signUp, router, sanitizedRedirect],
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div
        className={cn(
          "w-full max-w-lg space-y-6 rounded-3xl border border-border/60 bg-card/90 p-8 shadow-xl backdrop-blur",
          "sm:p-10",
        )}
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Sign up with your email address to access personalized features and manage your preferences.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to create account</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert>
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                name="email"
                className="w-full rounded-full px-4 py-3"
                required
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="register-username">Username</Label>
              <Input
                id="register-username"
                type="text"
                autoComplete="username"
                placeholder="yourhandle"
                name="username"
                className="w-full rounded-full px-4 py-3"
                required
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                name="password"
                className="w-full rounded-full px-4 py-3"
                required
                ref={passwordRef}
                onChange={checkPasswordMatch}
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="register-confirm">Confirm password</Label>
              <Input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                name="confirmPassword"
                className="w-full rounded-full px-4 py-3"
                required
                ref={confirmRef}
                onChange={checkPasswordMatch}
              />
              {passwordMismatch ? (
                <p className="text-sm text-destructive">Passwords do not match.</p>
              ) : null}
            </div>
          </div>

          <Button type="submit" className="w-full" size="xl" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  )
}

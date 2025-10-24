"use client"

import type React from "react"
import { useMemo } from "react"
import { useFormState, useFormStatus } from "react-dom"

import { initialAuthFormState, registerWithPasswordAction } from "@/app/auth/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface RegisterFormProps {
  redirectTo?: string
}

export default function RegisterForm({ redirectTo }: RegisterFormProps) {
  const [state, action] = useFormState(registerWithPasswordAction, initialAuthFormState)

  const sanitizedRedirect = useMemo(() => {
    if (!redirectTo) return "/"
    return redirectTo.startsWith("/") ? redirectTo : "/"
  }, [redirectTo])

  const hasMessage = state.status !== "idle" && state.message
  const isError = state.status === "error"

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

        {hasMessage ? (
          <Alert variant={isError ? "destructive" : "default"}>
            <AlertTitle>{isError ? "Unable to create account" : "Check your email"}</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-6" action={action}>
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
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                name="password"
                className="w-full rounded-full px-4 py-3"
                required
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
              />
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={sanitizedRedirect} />

          <SubmitButton>Create account</SubmitButton>
        </form>
      </div>
    </div>
  )
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" size="xl" disabled={pending}>
      {pending ? "Creating account..." : children}
    </Button>
  )
}

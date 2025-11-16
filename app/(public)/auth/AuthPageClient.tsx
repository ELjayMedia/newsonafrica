"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useFormState, useFormStatus } from "react-dom"

import { sendMagicLinkAction, signInWithPasswordAction, signUpWithPasswordAction, initialAuthFormState } from "./actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type AuthView = "sign_in" | "sign_up"

interface AuthPageClientProps {
  searchParams?: {
    redirectTo?: string
    returnTo?: string
    error?: string
  }
  defaultView?: AuthView
}

interface StatusMessage {
  kind: "success" | "error"
  title: string
  description?: string
}

export default function AuthPageClient({ searchParams, defaultView }: AuthPageClientProps) {
  const urlParams = useSearchParams()

  const tabParam = urlParams?.get("tab")
  const initialView: AuthView = (() => {
    if (tabParam === "signup") {
      return "sign_up"
    }

    if (tabParam === "signin") {
      return "sign_in"
    }

    return defaultView ?? "sign_in"
  })()

  const redirectParam = searchParams?.redirectTo ?? searchParams?.returnTo
  const redirectTo = useMemo(() => {
    if (!redirectParam) return "/"
    return redirectParam.startsWith("/") ? redirectParam : "/"
  }, [redirectParam])

  const [activeView, setActiveView] = useState<AuthView>(initialView)
  const [globalMessage, setGlobalMessage] = useState<StatusMessage | null>(null)

  const [signInState, signInAction] = useFormState(signInWithPasswordAction, initialAuthFormState)
  const [signUpState, signUpAction] = useFormState(signUpWithPasswordAction, initialAuthFormState)
  const [signInMagicState, signInMagicAction] = useFormState(sendMagicLinkAction, initialAuthFormState)
  const [signUpMagicState, signUpMagicAction] = useFormState(sendMagicLinkAction, initialAuthFormState)

  useEffect(() => {
    setActiveView(initialView)
  }, [initialView])

  useEffect(() => {
    if (searchParams?.error) {
      setGlobalMessage({
        kind: "error",
        title: "We couldn't complete your sign in",
        description: "Please try again or request a new magic link.",
      })
    }
  }, [searchParams?.error])
  useEffect(() => {
    if (signUpState.status === "success") {
      setActiveView("sign_in")
      setGlobalMessage({
        kind: "success",
        title: "Check your email",
        description:
          signUpState.message ?? "We've sent a confirmation link to finish setting up your account.",
      })
    }
  }, [signUpState])

  const resetGlobalMessage = () => setGlobalMessage(null)

  const signInFormMessage = signInState.status !== "idle" ? signInState.message : null
  const signUpFormMessage =
    signUpState.status === "error" && signUpState.message ? signUpState.message : null
  const signInMagicMessage =
    signInMagicState.status !== "idle" && signInMagicState.message ? signInMagicState.message : null
  const signUpMagicMessage =
    signUpMagicState.status !== "idle" && signUpMagicState.message ? signUpMagicState.message : null

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
            {activeView === "sign_in" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Sign in with your email and password or request a secure magic link.
          </p>
        </div>

        {globalMessage ? (
          <Alert variant={globalMessage.kind === "error" ? "destructive" : "default"}>
            <AlertTitle>{globalMessage.title}</AlertTitle>
            {globalMessage.description ? (
              <AlertDescription>{globalMessage.description}</AlertDescription>
            ) : null}
          </Alert>
        ) : null}

        <Tabs
          value={activeView}
          onValueChange={(value) => {
            setActiveView(value as AuthView)
            resetGlobalMessage()
          }}
          className="space-y-6"
        >
          <TabsList variant="pills" className="mx-auto flex w-fit gap-2 bg-muted/60 px-2 py-2">
            <TabsTrigger value="sign_in" className="px-6">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="sign_up" className="px-6">
              Sign up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sign_in" className="space-y-8">
            <form className="space-y-6" action={signInAction} onSubmit={resetGlobalMessage}>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    name="email"
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    name="password"
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
              </div>
              <input type="hidden" name="redirectTo" value={redirectTo} />
              {signInFormMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription>{signInFormMessage}</AlertDescription>
                </Alert>
              ) : null}
              <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
            </form>

            <div className="space-y-4 rounded-3xl border border-dashed border-border/60 p-6 text-center">
              <p className="text-sm font-medium text-foreground">Prefer a one-time link?</p>
              <form className="space-y-4" action={signInMagicAction} onSubmit={resetGlobalMessage}>
                <div className="space-y-2 text-left">
                  <Label htmlFor="magic-email">Email</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    name="email"
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
                <input type="hidden" name="redirectTo" value={redirectTo} />
                {signInMagicMessage ? (
                  <Alert variant={signInMagicState.status === "error" ? "destructive" : "default"}>
                    <AlertTitle>
                      {signInMagicState.status === "error"
                        ? "Couldn't send magic link"
                        : "Magic link sent"}
                    </AlertTitle>
                    <AlertDescription>{signInMagicMessage}</AlertDescription>
                  </Alert>
                ) : null}
                <SubmitButton variant="outline" pendingLabel="Sending...">
                  Email me a magic link
                </SubmitButton>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="sign_up" className="space-y-8">
            <form className="space-y-6" action={signUpAction} onSubmit={resetGlobalMessage}>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    name="email"
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    name="password"
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="signup-confirm">Confirm password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    autoComplete="new-password"
                    name="confirmPassword"
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
              </div>
              <input type="hidden" name="redirectTo" value={redirectTo} />
              {signUpFormMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Unable to create account</AlertTitle>
                  <AlertDescription>{signUpFormMessage}</AlertDescription>
                </Alert>
              ) : null}
              <SubmitButton pendingLabel="Creating account...">Create account</SubmitButton>
            </form>

            <div className="space-y-4 rounded-3xl border border-dashed border-border/60 p-6 text-center">
              <p className="text-sm font-medium text-foreground">Or get started instantly</p>
              <form className="space-y-4" action={signUpMagicAction} onSubmit={resetGlobalMessage}>
                <div className="space-y-2 text-left">
                  <Label htmlFor="magic-email-signup">Email</Label>
                  <Input
                    id="magic-email-signup"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    name="email"
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
                <input type="hidden" name="redirectTo" value={redirectTo} />
                {signUpMagicMessage ? (
                  <Alert variant={signUpMagicState.status === "error" ? "destructive" : "default"}>
                    <AlertTitle>
                      {signUpMagicState.status === "error"
                        ? "Couldn't send magic link"
                        : "Magic link sent"}
                    </AlertTitle>
                    <AlertDescription>{signUpMagicMessage}</AlertDescription>
                  </Alert>
                ) : null}
                <SubmitButton variant="outline" pendingLabel="Sending...">
                  Send me a magic link
                </SubmitButton>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function SubmitButton({
  children,
  pendingLabel,
  variant,
}: {
  children: React.ReactNode
  pendingLabel: string
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" size="xl" variant={variant} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/api/supabase"
import { cn } from "@/lib/utils"

type AuthView = "sign_in" | "sign_up"

interface AuthPageClientProps {
  searchParams?: {
    redirectTo?: string
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
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseClient(), [])

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

  const redirectParam = searchParams?.redirectTo
  const redirectTo = useMemo(() => {
    if (!redirectParam) return "/"
    return redirectParam.startsWith("/") ? redirectParam : "/"
  }, [redirectParam])

  const [activeView, setActiveView] = useState<AuthView>(initialView)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [magicEmail, setMagicEmail] = useState("")
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isMagicLoading, setIsMagicLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  useEffect(() => {
    setActiveView(initialView)
  }, [initialView])

  useEffect(() => {
    if (searchParams?.error) {
      setStatusMessage({
        kind: "error",
        title: "We couldn't complete your sign in",
        description: "Please try again or request a new magic link.",
      })
    }
  }, [searchParams?.error])

  const getCallbackUrl = () => {
    if (typeof window === "undefined") return undefined
    const callback = new URL("/auth/callback", window.location.origin)
    if (redirectTo && redirectTo !== "/") {
      callback.searchParams.set("next", redirectTo)
    }
    return callback.toString()
  }

  const resetMessages = () => setStatusMessage(null)

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetMessages()
    setIsPasswordLoading(true)

    const formEmail = email.trim().toLowerCase()
    const formPassword = password.trim()

    if (!formEmail || !formPassword) {
      setStatusMessage({
        kind: "error",
        title: "Please enter your email and password.",
      })
      setIsPasswordLoading(false)
      return
    }

    if (activeView === "sign_up") {
      if (formPassword.length < 6) {
        setStatusMessage({
          kind: "error",
          title: "Password is too short",
          description: "Use at least 6 characters to create your account.",
        })
        setIsPasswordLoading(false)
        return
      }

      if (formPassword !== confirmPassword.trim()) {
        setStatusMessage({
          kind: "error",
          title: "Passwords do not match",
          description: "Confirm your password before continuing.",
        })
        setIsPasswordLoading(false)
        return
      }

      const { error } = await supabase.auth.signUp({
        email: formEmail,
        password: formPassword,
        options: {
          emailRedirectTo: getCallbackUrl(),
        },
      })

      if (error) {
        setStatusMessage({
          kind: "error",
          title: "Unable to create account",
          description: error.message,
        })
        setIsPasswordLoading(false)
        return
      }

      setStatusMessage({
        kind: "success",
        title: "Check your email",
        description: "We've sent a confirmation link to finish setting up your account.",
      })
      setActiveView("sign_in")
      setPassword("")
      setConfirmPassword("")
      setIsPasswordLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: formEmail,
      password: formPassword,
    })

    if (error) {
      setStatusMessage({
        kind: "error",
        title: "Sign in failed",
        description: error.message,
      })
      setIsPasswordLoading(false)
      return
    }

    setStatusMessage({
      kind: "success",
      title: "Welcome back!",
      description: "You're being redirected to your destination.",
    })

    router.push(redirectTo)
    router.refresh()
    setIsPasswordLoading(false)
  }

  const handleMagicLinkSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetMessages()
    setIsMagicLoading(true)

    const emailAddress = magicEmail.trim().toLowerCase()

    if (!emailAddress) {
      setStatusMessage({
        kind: "error",
        title: "Please provide an email address.",
      })
      setIsMagicLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: emailAddress,
      options: {
        emailRedirectTo: getCallbackUrl(),
      },
    })

    if (error) {
      setStatusMessage({
        kind: "error",
        title: "Couldn't send magic link",
        description: error.message,
      })
      setIsMagicLoading(false)
      return
    }

    setStatusMessage({
      kind: "success",
      title: "Magic link sent",
      description: "Check your inbox for a secure sign-in link.",
    })
    setIsMagicLoading(false)
  }

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

        {statusMessage && (
          <Alert variant={statusMessage.kind === "error" ? "destructive" : "default"}>
            <AlertTitle>{statusMessage.title}</AlertTitle>
            {statusMessage.description ? <AlertDescription>{statusMessage.description}</AlertDescription> : null}
          </Alert>
        )}

        <Tabs
          value={activeView}
          onValueChange={(value) => {
            setActiveView(value as AuthView)
            setStatusMessage(null)
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
            <form className="space-y-6" onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="xl" disabled={isPasswordLoading}>
                {isPasswordLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="space-y-4 rounded-3xl border border-dashed border-border/60 p-6 text-center">
              <p className="text-sm font-medium text-foreground">Prefer a one-time link?</p>
              <form className="space-y-4" onSubmit={handleMagicLinkSubmit}>
                <div className="space-y-2 text-left">
                  <Label htmlFor="magic-email">Email</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={magicEmail}
                    onChange={(event) => setMagicEmail(event.target.value)}
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" size="xl" disabled={isMagicLoading}>
                  {isMagicLoading ? "Sending..." : "Email me a magic link"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="sign_up" className="space-y-8">
            <form className="space-y-6" onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="xl" disabled={isPasswordLoading}>
                {isPasswordLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="space-y-4 rounded-3xl border border-dashed border-border/60 p-6 text-center">
              <p className="text-sm font-medium text-foreground">Or get started instantly</p>
              <form className="space-y-4" onSubmit={handleMagicLinkSubmit}>
                <div className="space-y-2 text-left">
                  <Label htmlFor="magic-email-signup">Email</Label>
                  <Input
                    id="magic-email-signup"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={magicEmail}
                    onChange={(event) => setMagicEmail(event.target.value)}
                    className="w-full rounded-full px-4 py-3"
                    required
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" size="xl" disabled={isMagicLoading}>
                  {isMagicLoading ? "Sending..." : "Send me a magic link"}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

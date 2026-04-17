"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useFormState, useFormStatus } from "react-dom"

import { sendMagicLinkAction, signInWithPasswordAction, signUpWithPasswordAction, initialAuthFormState } from "./actions"
import { signInWithOAuth } from "@/app/actions/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
  const pathname = usePathname()
  const router = useRouter()

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
    if (!redirectParam.startsWith("/")) return "/"
    if (redirectParam.startsWith("//") || redirectParam.startsWith("/\\")) return "/"
    return redirectParam
  }, [redirectParam])

  const [activeView, setActiveView] = useState<AuthView>(initialView)
  const [globalMessage, setGlobalMessage] = useState<StatusMessage | null>(null)

  const [signInState, signInAction] = useFormState(signInWithPasswordAction, initialAuthFormState)
  const [signUpState, signUpAction] = useFormState(signUpWithPasswordAction, initialAuthFormState)
  const [magicLinkState, magicLinkAction] = useFormState(sendMagicLinkAction, initialAuthFormState)

  // (#10) Client-side password mismatch check
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const checkPasswordMatch = useCallback(() => {
    const pw = passwordRef.current?.value ?? ""
    const confirm = confirmRef.current?.value ?? ""
    setPasswordMismatch(confirm.length > 0 && pw !== confirm)
  }, [])

  // (#6) OAuth loading state
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | null>(null)
  const handleOAuth = useCallback(async (provider: "google" | "facebook") => {
    setOauthLoading(provider)
    try {
      const result = await signInWithOAuth({ provider })
      if (result.error) {
        setGlobalMessage({ kind: "error", title: "Sign in failed", description: result.error.message })
        return
      }
      const url = result.data?.url
      if (url) {
        window.location.assign(url)
      }
    } catch {
      setGlobalMessage({ kind: "error", title: "Sign in failed", description: "Could not connect to the sign-in provider." })
    } finally {
      setOauthLoading(null)
    }
  }, [])

  useEffect(() => {
    setActiveView(initialView)
  }, [initialView])

  useEffect(() => {
    if (!searchParams?.error) return

    setGlobalMessage({
      kind: "error",
      title: "We couldn't complete your sign in",
      description: "Please try again or request a new magic link.",
    })

    if (!urlParams || !pathname) return
    const params = new URLSearchParams(urlParams.toString())
    params.delete("error")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams?.error, urlParams])

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

  // (#5) Only clear error-type banners on tab switch or form submit;
  // preserve success banners (e.g. "Check your email") so the user
  // can still see them after navigating between tabs.
  const clearErrors = useCallback(() => {
    setGlobalMessage((prev) => (prev?.kind === "error" ? null : prev))
  }, [])

  const signInFormMessage = signInState.status === "error" ? signInState.message : null
  const signUpFormMessage =
    signUpState.status === "error" && signUpState.message ? signUpState.message : null
  const magicLinkMessage =
    magicLinkState.status !== "idle" && magicLinkState.message ? magicLinkState.message : null

  const anyOAuthLoading = oauthLoading !== null

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

        {/* (#6) OAuth sign-in buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="xl"
            className="w-full gap-3"
            disabled={anyOAuthLoading}
            aria-busy={oauthLoading === "google"}
            onClick={() => handleOAuth("google")}
          >
            <GoogleIcon />
            {oauthLoading === "google" ? "Redirecting..." : "Continue with Google"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xl"
            className="w-full gap-3"
            disabled={anyOAuthLoading}
            aria-busy={oauthLoading === "facebook"}
            onClick={() => handleOAuth("facebook")}
          >
            <FacebookIcon />
            {oauthLoading === "facebook" ? "Redirecting..." : "Continue with Facebook"}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs uppercase text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <Tabs
          value={activeView}
          onValueChange={(value) => {
            setActiveView(value as AuthView)
            clearErrors()
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
            <form className="space-y-6" action={signInAction} onSubmit={clearErrors}>
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

            {/* (#11) Shared magic-link form */}
            <MagicLinkSection
              id="magic-email-signin"
              label="Prefer a one-time link?"
              buttonLabel="Email me a magic link"
              action={magicLinkAction}
              state={magicLinkState}
              message={magicLinkMessage}
              redirectTo={redirectTo}
              onSubmit={clearErrors}
            />
          </TabsContent>

          <TabsContent value="sign_up" className="space-y-8">
            <form className="space-y-6" action={signUpAction} onSubmit={clearErrors}>
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
                    ref={passwordRef}
                    onChange={checkPasswordMatch}
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
                    ref={confirmRef}
                    onChange={checkPasswordMatch}
                  />
                  {/* (#10) Instant client-side mismatch feedback */}
                  {passwordMismatch ? (
                    <p className="text-sm text-destructive">Passwords do not match.</p>
                  ) : null}
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

            <MagicLinkSection
              id="magic-email-signup"
              label="Or get started instantly"
              buttonLabel="Send me a magic link"
              action={magicLinkAction}
              state={magicLinkState}
              message={magicLinkMessage}
              redirectTo={redirectTo}
              onSubmit={clearErrors}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// (#9) aria-busy signals pending state to assistive technology
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
    <Button type="submit" className="w-full" size="xl" variant={variant} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

// (#11) Extracted magic-link form — used in both tabs
function MagicLinkSection({
  id,
  label,
  buttonLabel,
  action,
  state,
  message,
  redirectTo,
  onSubmit,
}: {
  id: string
  label: string
  buttonLabel: string
  action: (payload: FormData) => void
  state: { status: string }
  message: string | null
  redirectTo: string
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4 rounded-3xl border border-dashed border-border/60 p-6 text-center">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <form className="space-y-4" action={action} onSubmit={onSubmit}>
        <div className="space-y-2 text-left">
          <Label htmlFor={id}>Email</Label>
          <Input
            id={id}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            name="email"
            className="w-full rounded-full px-4 py-3"
            required
          />
        </div>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {message ? (
          <Alert variant={state.status === "error" ? "destructive" : "default"}>
            <AlertTitle>
              {state.status === "error" ? "Couldn't send magic link" : "Magic link sent"}
            </AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        <SubmitButton variant="outline" pendingLabel="Sending...">
          {buttonLabel}
        </SubmitButton>
      </form>
    </div>
  )
}

// (#6) Inline SVG icons — avoids adding a dependency for two icons
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M18 9a9 9 0 1 0-10.406 8.89v-6.29H5.309V9h2.285V7.017c0-2.255 1.343-3.501 3.4-3.501.984 0 2.014.176 2.014.176v2.215h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.6h-2.097v6.29A9.002 9.002 0 0 0 18 9Z" fill="#1877F2" />
      <path d="m12.503 11.6.399-2.6h-2.496V7.313c0-.712.349-1.406 1.467-1.406h1.135V3.692s-1.03-.176-2.014-.176c-2.057 0-3.4 1.246-3.4 3.501V9H5.309v2.6h2.285v6.29a9.07 9.07 0 0 0 2.812 0v-6.29h2.097Z" fill="#fff" />
    </svg>
  )
}

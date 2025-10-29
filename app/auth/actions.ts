"use server"

import { redirect } from "next/navigation"

import { writeSessionCookie } from "@/lib/auth/session-cookie"
import { getSupabaseClient } from "@/lib/supabase/server-component-client"

export type AuthFormState = {
  status: "idle" | "success" | "error"
  message: string | null
}

export const initialAuthFormState: AuthFormState = Object.freeze({
  status: "idle" as const,
  message: null,
})

const DEFAULT_SUCCESS_MESSAGE = "We've sent a confirmation link to your email."
const DEFAULT_ERROR_MESSAGE = "We couldn't process your request. Please try again."

function createSuccessState(message: string): AuthFormState {
  return { status: "success", message }
}

function createErrorState(message: string): AuthFormState {
  return { status: "error", message }
}

function normalizeEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null
  }

  const email = value.trim().toLowerCase()
  return email.length > 0 ? email : null
}

function normalizePassword(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null
  }

  const password = value.trim()
  return password.length > 0 ? password : null
}

function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) {
    return configured.replace(/\/$/, "")
  }

  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }

  return "http://localhost:3000"
}

function getRedirectPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null
  }

  if (!value.startsWith("/")) {
    return null
  }

  try {
    const url = new URL(value, getSiteUrl())
    return url.pathname + url.search + url.hash
  } catch {
    return null
  }
}

function getAuthCallbackUrl(nextPath: string | null): string {
  const callbackUrl = new URL("/auth/callback", getSiteUrl())

  if (nextPath && nextPath !== "/") {
    callbackUrl.searchParams.set("next", nextPath)
  }

  return callbackUrl.toString()
}

export async function signInWithPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const email = normalizeEmail(formData.get("email"))
    const password = normalizePassword(formData.get("password"))
    const redirectTo = getRedirectPath(formData.get("redirectTo")) ?? "/"

    if (!email || !password) {
      return createErrorState("Email and password are required.")
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return createErrorState(error.message)
    }

    const userId = data.user?.id
    if (userId) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url, role, created_at, updated_at")
          .eq("id", userId)
          .maybeSingle()

        await writeSessionCookie({
          userId,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
          role: profile?.role ?? null,
          created_at: profile?.created_at ?? null,
          updated_at: profile?.updated_at ?? null,
        })
      } catch (cookieError) {
        console.error("Failed to prime session cookie after password sign-in", cookieError)
      }
    }

    redirect(redirectTo)
  } catch (error) {
    console.error("Failed to sign in", error)
    return createErrorState(DEFAULT_ERROR_MESSAGE)
  }

  return createSuccessState("Signed in successfully.")
}

export async function signUpWithPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const email = normalizeEmail(formData.get("email"))
    const password = normalizePassword(formData.get("password"))
    const confirmPassword = normalizePassword(formData.get("confirmPassword"))
    const redirectTo = getRedirectPath(formData.get("redirectTo"))

    if (!email) {
      return createErrorState("Please provide a valid email address.")
    }

    if (!password) {
      return createErrorState("Password is required.")
    }

    if (password.length < 6) {
      return createErrorState("Password must be at least 6 characters long.")
    }

    if (!confirmPassword || confirmPassword !== password) {
      return createErrorState("Passwords do not match.")
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(redirectTo),
      },
    })

    if (error) {
      return createErrorState(error.message)
    }

    const userId = data.user?.id
    if (userId) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url, role, created_at, updated_at")
          .eq("id", userId)
          .maybeSingle()

        await writeSessionCookie({
          userId,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
          role: profile?.role ?? null,
          created_at: profile?.created_at ?? null,
          updated_at: profile?.updated_at ?? null,
        })
      } catch (cookieError) {
        console.error("Failed to prime session cookie after password sign-up", cookieError)
      }
    }

    return createSuccessState(
      "Check your email for a confirmation link to finish setting up your account.",
    )
  } catch (error) {
    console.error("Failed to sign up", error)
    return createErrorState(DEFAULT_ERROR_MESSAGE)
  }
}

export async function sendMagicLinkAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const email = normalizeEmail(formData.get("email"))
    const redirectTo = getRedirectPath(formData.get("redirectTo"))

    if (!email) {
      return createErrorState("Please provide an email address.")
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(redirectTo),
      },
    })

    if (error) {
      return createErrorState(error.message)
    }

    return createSuccessState("We've sent a secure sign-in link to your email address.")
  } catch (error) {
    console.error("Failed to send magic link", error)
    return createErrorState(DEFAULT_ERROR_MESSAGE)
  }
}

export async function registerWithPasswordAction(
  prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await signUpWithPasswordAction(prevState, formData)

  if (result.status === "success" && !result.message) {
    return createSuccessState(DEFAULT_SUCCESS_MESSAGE)
  }

  return result
}

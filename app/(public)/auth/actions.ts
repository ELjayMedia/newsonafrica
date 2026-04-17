"use server"

import type { SupabaseClient } from "@supabase/supabase-js"

import { SUPABASE_UNAVAILABLE_ERROR, createServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"

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
const AUTH_SERVICE_UNAVAILABLE_MESSAGE =
  "Authentication is temporarily unavailable. Please try again later."

type SupabaseServerClient = SupabaseClient<Database>

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

  // Reject protocol-relative paths up-front.
  if (value.startsWith("//") || value.startsWith("/\\")) {
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

async function createSupabaseClient(): Promise<SupabaseServerClient | null> {
  const client = await createServerClient()

  if (!client) {
    console.warn(SUPABASE_UNAVAILABLE_ERROR)
  }

  return client
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const email = normalizeEmail(formData.get("email"))

    if (!email) {
      return createErrorState("Email is required.")
    }

    const supabase = await createSupabaseClient()

    if (!supabase) {
      return createErrorState(AUTH_SERVICE_UNAVAILABLE_MESSAGE)
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl("/auth/update-password"),
    })

    if (error) {
      return createErrorState(error.message)
    }

    return createSuccessState(DEFAULT_SUCCESS_MESSAGE)
  } catch (error) {
    console.error("Failed to send reset password email", error)

    if (error instanceof Error && error.message.startsWith("Missing ")) {
      return createErrorState(error.message)
    }

    return createErrorState(DEFAULT_ERROR_MESSAGE)
  }
}

export async function sendMagicLinkAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const email = normalizeEmail(formData.get("email"))
    const redirectTo = getRedirectPath(formData.get("redirectTo")) ?? "/"

    if (!email) {
      return createErrorState("Email is required.")
    }

    const supabase = await createSupabaseClient()

    if (!supabase) {
      return createErrorState(AUTH_SERVICE_UNAVAILABLE_MESSAGE)
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(redirectTo),
      },
    })

    if (error) {
      return createErrorState(error.message)
    }

    return createSuccessState(DEFAULT_SUCCESS_MESSAGE)
  } catch (error) {
    console.error("Failed to send magic link", error)

    if (error instanceof Error && error.message.startsWith("Missing ")) {
      return createErrorState(error.message)
    }

    return createErrorState(DEFAULT_ERROR_MESSAGE)
  }
}

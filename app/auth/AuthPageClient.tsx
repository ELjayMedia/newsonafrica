"use client"

import { useSearchParams } from "next/navigation"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { useSupabaseClient } from "@supabase/auth-helpers-react"

export default function AuthPageClient() {
  const searchParams = useSearchParams()
  const supabase = useSupabaseClient()
  const view = searchParams?.get("tab") === "signup" ? "sign_up" : "sign_in"

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} view={view} providers={[]} />
    </div>
  )
}

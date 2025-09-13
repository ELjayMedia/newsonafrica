"use client"

import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { useSupabaseClient } from "@supabase/auth-helpers-react"

export default function RegisterPage() {
  const supabase = useSupabaseClient()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} view="sign_up" providers={[]} />
    </div>
  )
}

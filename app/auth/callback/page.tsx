import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: { code: string; state: string }
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { code, state } = searchParams

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        redirect("/auth?error=OAuth%20login%20failed")
      }
    } catch (error) {
      console.error("Error in auth callback:", error)
      redirect("/auth?error=OAuth%20login%20failed")
    }
  }

  // Try to parse the state to get the returnTo URL
  let returnTo = "/"
  try {
    if (state) {
      const decodedState = JSON.parse(decodeURIComponent(state))
      returnTo = decodedState.returnTo || "/"
    }
  } catch (error) {
    console.error("Error parsing state:", error)
  }

  redirect(returnTo)
}

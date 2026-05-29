import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { Providers } from "../providers"
import { AppChrome } from "../AppChrome"
import { createServerClient } from "@/lib/supabase/server"

interface AuthedLayoutProps {
  children: ReactNode
}

export default async function AuthedLayout({ children }: AuthedLayoutProps) {
  const supabase = await createServerClient()

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth")
    }
  }

  return (
    <Providers initialAuthState={null} initialPreferences={null}>
      <AppChrome>{children}</AppChrome>
    </Providers>
  )
}

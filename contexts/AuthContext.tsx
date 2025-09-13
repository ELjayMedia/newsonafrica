"use client"

import { ReactNode, useState } from "react"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState<SupabaseClient>(() => createBrowserSupabaseClient())
  return <SessionContextProvider supabaseClient={supabaseClient}>{children}</SessionContextProvider>
}

"use client"

import { ReactNode, useState } from "react"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState<SupabaseClient>(() => createPagesBrowserClient())
  return <SessionContextProvider supabaseClient={supabaseClient}>{children}</SessionContextProvider>
}

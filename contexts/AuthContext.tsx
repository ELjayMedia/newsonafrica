"use client"

import { ReactNode, useState } from "react"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/api/supabase"
import type { Database } from "@/types/supabase"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState<SupabaseClient>(() => {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase environment variables are not configured. Using fallback client in AuthProvider.")
      return getSupabaseClient()
    }

    return createPagesBrowserClient<Database>()
  })
  return <SessionContextProvider supabaseClient={supabaseClient}>{children}</SessionContextProvider>
}

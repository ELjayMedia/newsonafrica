"use client"

import { ReactNode, useState } from "react"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { createClient as createSupabaseClient } from "@/utils/supabase/client"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState(() => createSupabaseClient())
  return <SessionContextProvider supabaseClient={supabaseClient}>{children}</SessionContextProvider>
}

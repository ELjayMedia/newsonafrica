import type { CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createServerCookieAdapter() {
  return {
    get(name: string) {
      try {
        return cookies().get(name)?.value ?? null
      } catch {
        return null
      }
    },
    set(name: string, value: string, options: CookieOptions) {
      try {
        cookies().set({ name, value, ...options })
      } catch {
        // Setting cookies is unsupported in some server contexts (e.g. during rendering).
      }
    },
    remove(name: string, options: CookieOptions) {
      try {
        cookies().set({ name, value: "", ...options })
      } catch {
        // Removing cookies is unsupported in some server contexts.
      }
    },
  }
}

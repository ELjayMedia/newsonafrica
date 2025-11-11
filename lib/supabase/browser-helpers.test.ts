import { describe, it, expect, beforeEach, afterEach } from "vitest"

import { isSupabaseConfigured } from "./browser-helpers"

describe("isSupabaseConfigured", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    }

    if (originalAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey
    }
  })

  it("returns false when environment variables are missing", () => {
    expect(isSupabaseConfigured()).toBe(false)
  })

  it("returns true when environment variables are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

    expect(isSupabaseConfigured()).toBe(true)
  })
})

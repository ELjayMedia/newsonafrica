import { afterEach, describe, expect, it } from "vitest"

import { authHeaders, publicHeaders } from "./headers"

const ORIGINAL_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

afterEach(() => {
  if (typeof ORIGINAL_ANON_KEY === "string") {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_ANON_KEY
  } else {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
})

describe("supabase rest public headers", () => {
  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => publicHeaders()).toThrowError(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  })

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is blank", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "   "

    expect(() => publicHeaders()).toThrowError(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  })

  it("builds headers when NEXT_PUBLIC_SUPABASE_ANON_KEY is set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

    expect(authHeaders("access-token")).toEqual({
      apikey: "anon-key",
      Accept: "application/json",
      Authorization: "Bearer access-token",
    })
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const ORIGINAL_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ORIGINAL_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

afterEach(() => {
  if (typeof ORIGINAL_ANON_KEY === "string") {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_ANON_KEY
  } else {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }

  if (typeof ORIGINAL_SERVICE_ROLE_KEY === "string") {
    process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_SERVICE_ROLE_KEY
  } else {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  }
})

describe("supabase rest service role headers", () => {
  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { serviceRoleHeaders } = await import("./server")

    expect(() => serviceRoleHeaders()).toThrowError(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY",
    )
  })

  it("throws when SUPABASE_SERVICE_ROLE_KEY is blank", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "   "

    const { serviceRoleHeaders } = await import("./server")

    expect(() => serviceRoleHeaders()).toThrowError(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY",
    )
  })

  it("builds headers when service role key is present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"

    const { serviceRoleHeaders } = await import("./server")

    expect(serviceRoleHeaders()).toEqual({
      apikey: "anon-key",
      Accept: "application/json",
      Authorization: "Bearer service-role-key",
    })
  })
})

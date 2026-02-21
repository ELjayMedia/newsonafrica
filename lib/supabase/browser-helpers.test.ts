import { describe, expect, it } from "vitest"

import { isSupabaseConfigured } from "./browser-helpers"

describe("browser-helpers compatibility exports", () => {
  it("re-exports runtime helpers", () => {
    expect(typeof isSupabaseConfigured).toBe("function")
  })
})

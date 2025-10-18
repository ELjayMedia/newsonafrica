import { render, waitFor, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PreferredCountrySync } from "./PreferredCountrySync"

let currentPathname = "/"
const originalFetch = global.fetch

const createFetchMock = () =>
  vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))) as unknown as typeof fetch

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}))

describe("PreferredCountrySync", () => {
  beforeEach(() => {
    currentPathname = "/"
    window.localStorage.clear()
    document.cookie = "preferredCountry=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
    document.cookie = "country=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
    global.fetch = createFetchMock()
  })

  afterEach(() => {
    cleanup()
    global.fetch = originalFetch
  })

  it("writes the preferred country when navigating to a supported edition", async () => {
    currentPathname = "/za/news"

    render(<PreferredCountrySync />)

    await waitFor(() => {
      expect(window.localStorage.getItem("preferredCountry")).toBe("za")
      expect(document.cookie).toContain("preferredCountry=za")
    })
  })

  it("updates stored preference when the routed country changes", async () => {
    currentPathname = "/za"

    const { rerender } = render(<PreferredCountrySync />)

    await waitFor(() => {
      expect(window.localStorage.getItem("preferredCountry")).toBe("za")
      expect(document.cookie).toContain("preferredCountry=za")
    })

    currentPathname = "/sz"
    rerender(<PreferredCountrySync />)

    await waitFor(() => {
      expect(window.localStorage.getItem("preferredCountry")).toBe("sz")
      expect(document.cookie).toContain("preferredCountry=sz")
    })
  })

  it("does nothing when visiting paths without a supported country", async () => {
    currentPathname = "/"

    render(<PreferredCountrySync />)

    await waitFor(() => {
      expect(window.localStorage.getItem("preferredCountry")).toBeNull()
      expect(document.cookie.includes("preferredCountry=")).toBe(false)
    })
  })
})

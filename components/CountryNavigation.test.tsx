import { render, screen, waitFor, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CountrySpotlight } from "./CountryNavigation"
import type { PanAfricanSpotlightPayload } from "@/types/home"

vi.mock("@/lib/wordpress/client", () => ({
  COUNTRIES: {
    sz: { code: "sz", name: "Eswatini", flag: "🇸🇿" },
    ng: { code: "ng", name: "Nigeria", flag: "🇳🇬" },
    za: { code: "za", name: "South Africa", flag: "🇿🇦" },
    ke: { code: "ke", name: "Kenya", flag: "🇰🇪" },
  },
}))

vi.mock("@/lib/utils/routing", () => ({
  getCurrentCountry: vi.fn(() => "sz"),
}))

type Deferred = {
  resolve: (value: Response) => void
  reject: (reason?: unknown) => void
  country: string
}

const createResponse = (payload: PanAfricanSpotlightPayload) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

describe("CountrySpotlight", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    global.fetch = originalFetch
  })

  it("shows a loading indicator while spotlight stories are fetched", async () => {
    const deferreds: Deferred[] = []

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const href =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url
      const url = new URL(href, "https://example.com")
      const country = url.searchParams.get("country") ?? ""
      return new Promise<Response>((resolve, reject) => {
        deferreds.push({ resolve, reject, country })
      })
    }) as unknown as typeof fetch

    render(<CountrySpotlight />)

    await waitFor(() => {
      expect(screen.getByText("Loading stories from across Africa...")).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledTimes(3)

    deferreds.forEach(({ resolve, country }) => resolve(createResponse({ country, posts: [] })))
  })

  it("renders spotlight cards once data is loaded", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const href =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url
      const url = new URL(href, "https://example.com")
      const country = url.searchParams.get("country") ?? ""
      const posts = [
        {
          id: `${country}-1`,
          slug: `${country}-story`,
          title: `${country.toUpperCase()} headline`,
          excerpt: "",
          date: "2024-02-02",
          country,
        },
      ]
      return Promise.resolve(createResponse({ country, posts }))
    }) as unknown as typeof fetch

    render(<CountrySpotlight />)

    await waitFor(() => {
      expect(screen.getByText("Pan-African Spotlight")).toBeInTheDocument()
    })

    expect(screen.getByText("Nigeria")).toBeInTheDocument()
    expect(screen.getByText("View all Nigeria news")).toBeInTheDocument()
    expect(screen.getByText("NG headline")).toBeInTheDocument()
  })

  it("gracefully hides the spotlight when requests fail", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("offline"))) as unknown as typeof fetch

    render(<CountrySpotlight />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.queryByText("Pan-African Spotlight")).not.toBeInTheDocument()
    })
  })
})

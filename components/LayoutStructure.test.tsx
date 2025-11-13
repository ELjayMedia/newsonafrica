// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const headerMock = vi.fn(() => null)
const sidebarMock = vi.fn(() => null)
const getServerCountryMock = vi.fn(() => "sz")

let headerValues: Record<string, string | undefined> = {}

vi.mock("next/headers", () => ({
  headers: () => ({
    get: (key: string) => headerValues[key] ?? null,
  }),
}))

vi.mock("@/components/Header", () => ({
  Header: headerMock,
}))

vi.mock("@/components/Sidebar", () => ({
  Sidebar: sidebarMock,
}))

vi.mock("@/lib/utils/routing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils/routing")>(
    "@/lib/utils/routing",
  )

  return {
    ...actual,
    getServerCountry: getServerCountryMock,
  }
})

describe("LayoutStructure", () => {
  beforeEach(() => {
    headerValues = {}
    headerMock.mockClear()
    sidebarMock.mockClear()
    getServerCountryMock.mockClear()
    getServerCountryMock.mockReturnValue("sz")
  })

  afterEach(() => {
    cleanup()
  })

  it("passes the request edition to the header and sidebar", async () => {
    headerValues = {
      "x-invoke-path": "/za/latest",
    }

    const { LayoutStructure } = await import("./LayoutStructure")

    render(
      <LayoutStructure>
        <div>content</div>
      </LayoutStructure>,
    )

    expect(headerMock).toHaveBeenCalledTimes(1)
    expect(headerMock.mock.calls[0][0]?.countryCode).toBe("za")
    expect(sidebarMock).toHaveBeenCalledTimes(1)
    expect(sidebarMock.mock.calls[0][0]?.country).toBe("za")
    expect(getServerCountryMock).not.toHaveBeenCalled()
  })

  it("normalizes the African edition alias from the request path", async () => {
    headerValues = {
      "x-matched-path": "/african/headlines",
    }

    const { LayoutStructure } = await import("./LayoutStructure")

    render(
      <LayoutStructure>
        <div>content</div>
      </LayoutStructure>,
    )

    expect(headerMock).toHaveBeenCalledTimes(1)
    expect(headerMock.mock.calls[0][0]?.countryCode).toBe("african-edition")
    expect(sidebarMock).toHaveBeenCalledTimes(1)
    expect(sidebarMock.mock.calls[0][0]?.country).toBe("african-edition")
    expect(getServerCountryMock).not.toHaveBeenCalled()
  })

  it("falls back to the server country when no edition is present", async () => {
    getServerCountryMock.mockReturnValue("ng")

    const { LayoutStructure } = await import("./LayoutStructure")

    render(
      <LayoutStructure>
        <div>content</div>
      </LayoutStructure>,
    )

    expect(getServerCountryMock).toHaveBeenCalledTimes(1)
    expect(headerMock).toHaveBeenCalledTimes(1)
    expect(headerMock.mock.calls[0][0]?.countryCode).toBe("ng")
    expect(sidebarMock).toHaveBeenCalledTimes(1)
    expect(sidebarMock.mock.calls[0][0]?.country).toBe("ng")
  })
})


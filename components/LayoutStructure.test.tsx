import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { LayoutStructure } from "./LayoutStructure"

vi.mock("@/components/Header", () => ({
  Header: ({ countryCode }: { countryCode: string }) => (
    <div data-testid="header" data-country={countryCode} />
  ),
}))

vi.mock("@/components/Sidebar", () => ({
  Sidebar: ({ country }: { country: string }) => (
    <div data-testid="sidebar" data-country={country} />
  ),
}))

afterEach(() => {
  cleanup()
})

describe("LayoutStructure", () => {
  it.each([
    ["ng"],
    ["ke"],
  ])("passes the %s edition through to header and sidebar", (countryCode) => {
    render(
      <LayoutStructure countryCode={countryCode}>
        <div>Content</div>
      </LayoutStructure>,
    )

    expect(screen.getByTestId("header")).toHaveAttribute("data-country", countryCode)
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-country", countryCode)
  })
})

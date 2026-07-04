import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import OfflineFallback from "./OfflineFallback"

afterEach(() => {
  cleanup()
})

describe("OfflineFallback", () => {
  it("renders a single accessible Go Home anchor", () => {
    render(<OfflineFallback showCachedContent={false} />)

    const retryButton = screen.getByRole("button", { name: /try again/i })
    const homeLink = screen.getByRole("link", { name: /go home/i })

    expect(homeLink.tagName).toBe("A")
    expect(homeLink).toHaveAttribute("href", "/")

    retryButton.focus()
    expect(retryButton).toHaveFocus()

    homeLink.focus()
    expect(homeLink).toHaveFocus()

    fireEvent.click(homeLink)
  })
})

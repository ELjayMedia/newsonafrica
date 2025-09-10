import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { OfflineNotification } from "../OfflineNotification"

describe("OfflineNotification", () => {
  it("renders message when offline", () => {
    render(<OfflineNotification isOffline={true} message="Offline" />)
    expect(screen.getByText("Offline")).toBeInTheDocument()
  })

  it("renders nothing when online", () => {
    const { container } = render(<OfflineNotification isOffline={false} />)
    expect(container.firstChild).toBeNull()
  })
})

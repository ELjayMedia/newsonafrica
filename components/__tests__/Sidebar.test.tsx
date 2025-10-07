import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const useMediaQueryMock = vi.hoisted(() => vi.fn<boolean, [string]>())
const sidebarContentMock = vi.hoisted(() =>
  vi.fn(() => <div data-testid="sidebar-content">Sidebar Content</div>),
)
const sidebarSkeletonMock = vi.hoisted(() =>
  vi.fn(() => <div data-testid="sidebar-skeleton">Sidebar Skeleton</div>),
)

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: useMediaQueryMock,
}))

vi.mock("../SidebarContent", () => ({
  SidebarContent: sidebarContentMock,
}))

vi.mock("../SidebarSkeleton", () => ({
  SidebarSkeleton: sidebarSkeletonMock,
}))

import { Sidebar } from "../Sidebar"

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the skeleton when below the desktop breakpoint", () => {
    useMediaQueryMock.mockReturnValue(false)

    render(<Sidebar />)

    expect(sidebarContentMock).not.toHaveBeenCalled()
    expect(screen.getByTestId("sidebar-skeleton")).toBeInTheDocument()
  })

  it("renders the sidebar content when on desktop", () => {
    useMediaQueryMock.mockReturnValue(true)

    render(<Sidebar />)

    expect(sidebarContentMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument()
  })
})

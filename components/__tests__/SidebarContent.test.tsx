import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { SidebarContent } from "../SidebarContent"

const getCurrentCountry = vi.fn(() => "sz")
const getArticleUrl = vi.fn((slug: string, country?: string) => `/${country || "sz"}/${slug}`)

vi.mock("@/lib/utils/routing", () => ({
  getCurrentCountry: () => getCurrentCountry(),
  getArticleUrl: (slug: string, country?: string) => getArticleUrl(slug, country),
}))

vi.mock("@/contexts/UserPreferencesClient", () => ({
  useUserPreferences: () => ({
    preferences: {
      sections: ["business"],
    },
  }),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={typeof href === "string" ? href : href?.toString?.()} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}))

describe("SidebarContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentCountry.mockReturnValue("sz")
  })

  it("renders most read and personalized posts", () => {
    render(
      <SidebarContent
        data={{
          recent: [
            {
              id: "1",
              slug: "business-update",
              title: "Business Update",
              excerpt: "Latest insights",
              date: "2024-01-01",
              categories: { nodes: [{ slug: "business" }] },
            },
          ],
          mostRead: [
            {
              id: "2",
              slug: "top-story",
              title: "Top Story",
              excerpt: "Breaking news",
              date: "2024-01-02",
            },
          ],
        }}
      />,
    )

    expect(screen.getByText("Most Read")).toBeInTheDocument()
    expect(screen.getByText("Latest News")).toBeInTheDocument()
    expect(screen.getByText("Business Update")).toBeInTheDocument()
    expect(screen.getByText("Top Story")).toBeInTheDocument()
  })

  it("falls back to empty state when no posts are provided", () => {
    render(<SidebarContent data={{ recent: [], mostRead: [] }} />)

    expect(screen.getAllByText("No articles available")).toHaveLength(2)
  })

  it("uses the provided country code for links", () => {
    render(
      <SidebarContent
        data={{
          recent: [
            {
              id: "3",
              slug: "regional",
              title: "Regional Story",
              excerpt: "Updates",
              date: "2024-01-03",
              categories: { nodes: [] },
            },
          ],
          mostRead: [],
        }}
        country="ng"
      />,
    )

    expect(getArticleUrl).toHaveBeenCalledWith("regional", "ng")
  })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { HomeCategorySection } from "@/app/(home)/home-data"
import { HomeContent } from "./HomeContent"

vi.mock("next/dynamic", () => ({
  default: () => (props: any) => <div data-testid="dynamic" {...props} />,
}))

vi.mock("@/components/client/CountryNavigation", () => ({
  CountryNavigation: () => <nav data-testid="country-navigation" />,
  default: () => <nav data-testid="country-navigation" />,
}))

vi.mock("@/components/client/OfflineBanner", () => ({
  OfflineBanner: () => <div data-testid="offline-banner">offline</div>,
  default: () => <div data-testid="offline-banner">offline</div>,
}))

vi.mock("@/components/CountrySpotlight", () => ({
  __esModule: true,
  default: ({ countryPosts }: { countryPosts: Record<string, any[]> }) => (
    <div data-testid="spotlight">{Object.keys(countryPosts).join(",")}</div>
  ),
}))

const createPost = (slug: string) => ({
  id: slug,
  slug,
  date: new Date().toISOString(),
  title: slug,
  excerpt: slug,
})

const baseProps = {
  hero: createPost("hero"),
  secondaryStories: [createPost("secondary-1"), createPost("secondary-2")],
  featuredPosts: [createPost("featured-1")],
  countryPosts: { sz: [createPost("sz-1")] },
} as const

const makeCategorySection = (key: string, posts = [createPost(`${key}-post`)]) => ({
  key,
  posts,
  config: { name: key, layout: "grid" as const },
}) satisfies HomeCategorySection

describe("HomeContent", () => {
  it("renders empty state when no content is available", () => {
    render(
      <HomeContent
        {...baseProps}
        hero={null}
        secondaryStories={[]}
        featuredPosts={[]}
        categorySections={[]}
        contentState="empty"
        currentCountry="sz"
      />,
    )

    expect(screen.getByText("No Content Available")).toBeInTheDocument()
    expect(screen.queryByTestId("country-navigation")).not.toBeInTheDocument()
  })

  it("renders awaiting hero state when posts exist but hero is missing", () => {
    render(
      <HomeContent
        {...baseProps}
        hero={null}
        categorySections={[makeCategorySection("news")]}
        contentState="awaiting-hero"
        currentCountry="sz"
      />,
    )

    expect(screen.getByText("Featured Content Coming Soon")).toBeInTheDocument()
  })

  it("renders hero, secondary stories, and categories when content is ready", () => {
    render(
      <HomeContent
        {...baseProps}
        categorySections={[makeCategorySection("news"), makeCategorySection("business")]}
        contentState="ready"
        currentCountry="sz"
      />,
    )

    expect(screen.getByText("hero")).toBeInTheDocument()
    expect(screen.getAllByText(/secondary/)).toHaveLength(2)
    expect(screen.getByText("news")).toBeInTheDocument()
    expect(screen.getByText("business")).toBeInTheDocument()
    expect(screen.getByTestId("spotlight")).toHaveTextContent("sz")
  })
})

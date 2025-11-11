import { render, screen } from "@testing-library/react"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import {
  AuthorNewsList,
  RegularCategorySection,
  SportCategorySection,
  type NewsGridPost,
} from "../news-grid/NewsGridSections"
import { getCategoryUrl } from "@/lib/utils/routing"

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={typeof href === "string" ? href : href?.toString?.()} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority, loading, sizes, placeholder, blurDataURL, alt, ...rest }: any) => {
    const { fill: _fill, ...imgProps } = rest

    return (
      <img
        alt={alt}
        data-priority={priority ? "true" : "false"}
        data-loading={loading}
        data-sizes={sizes}
        data-placeholder={placeholder}
        data-has-blur={blurDataURL ? "true" : "false"}
        {...imgProps}
      />
    )
  },
}))

function createPost(id: string, overrides: Partial<NewsGridPost> = {}): NewsGridPost {
  return {
    id,
    title: `${id} title`,
    excerpt: `${id} excerpt`,
    slug: `${id}-slug`,
    date: "2024-01-01T00:00:00.000Z",
    type: "Sports",
    country: "ng",
    featuredImage: {
      node: {
        sourceUrl: `https://example.com/${id}.jpg`,
        altText: `${id} alt`,
      },
    },
    ...overrides,
  }
}

const expectedDate = new Date("2024-01-01T00:00:00.000Z").toLocaleDateString("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2024-02-10T00:00:00.000Z"))
})

afterAll(() => {
  vi.useRealTimers()
})

describe("SportCategorySection", () => {
  it("renders the main and secondary sports posts with metadata", () => {
    render(
      <SportCategorySection
        sportCategoryPosts={[
          createPost("main", { title: "Main Sport Story" }),
          createPost("secondary-1", { title: "Second Story" }),
          createPost("secondary-2", { title: "Third Story" }),
        ]}
      />,
    )

    expect(screen.getByText("Sports News")).toBeInTheDocument()
    expect(screen.getByText("View all")).toHaveAttribute("href", getCategoryUrl("sport"))

    expect(screen.getByText("Main Sport Story")).toBeInTheDocument()
    expect(screen.getAllByText(expectedDate)[0]).toBeInTheDocument()
    expect(screen.getByText("Second Story")).toBeInTheDocument()
    expect(screen.getByText("Third Story")).toBeInTheDocument()
  })
})

describe("RegularCategorySection", () => {
  it("renders a main story and secondary list", () => {
    render(
      <RegularCategorySection
        mainPost={createPost("main", { title: "Top Story" })}
        secondaryPosts={[
          createPost("secondary-1", { title: "Another Story" }),
          createPost("secondary-2", { title: "More News" }),
        ]}
      />,
    )

    expect(screen.getByText("Top Story")).toBeInTheDocument()
    expect(screen.getAllByText(expectedDate)[0]).toBeInTheDocument()
    expect(screen.getByText("Another Story")).toBeInTheDocument()
    expect(screen.getByText("More News")).toBeInTheDocument()
  })
})

describe("AuthorNewsList", () => {
  it("lists author posts with their publish dates", () => {
    render(
      <AuthorNewsList
        posts={[
          createPost("one", { title: "Author Story" }),
          createPost("two", { title: "Second Author Story" }),
        ]}
      />,
    )

    expect(screen.getByText("Author Story")).toBeInTheDocument()
    expect(screen.getByText("Second Author Story")).toBeInTheDocument()
    expect(screen.getAllByText(expectedDate).length).toBeGreaterThan(0)
  })
})

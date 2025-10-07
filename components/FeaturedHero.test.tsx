import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { FeaturedHero } from "./FeaturedHero"

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => (
    <a href={typeof href === "string" ? href : href?.toString?.()} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src, ...props }: any) => {
    const { blurDataURL: _blurDataURL, fill: _fill, priority: _priority, placeholder: _placeholder, ...rest } = props

    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={typeof src === "string" ? src : ""} {...rest} />
  },
}))

vi.mock("@/lib/utils/routing", () => ({
  getArticleUrl: (slug: string, country?: string) => `/${country ?? "sz"}/article/${slug}`,
}))

vi.mock("@/utils/lazy-load", () => ({
  generateBlurDataURL: () => "data:image/png;base64,placeholder",
}))

describe("FeaturedHero", () => {
  it("renders a fallback label when no date is provided", () => {
    const post = {
      title: "Breaking News",
      excerpt: "<p>Important story</p>",
      slug: "breaking-news",
      date: "",
      country: "ng",
      featuredImage: undefined,
      author: undefined,
    }

    render(<FeaturedHero post={post} />)

    expect(screen.getByText("Recently")).toBeInTheDocument()
  })
})

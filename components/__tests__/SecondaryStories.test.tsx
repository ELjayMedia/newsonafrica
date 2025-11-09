import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SecondaryStories } from "../SecondaryStories"

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

describe("SecondaryStories", () => {
  const createPost = (id: string, title: string) => ({
    id,
    title,
    slug: `${id}-slug`,
    date: new Date().toISOString(),
    featuredImage: {
      node: {
        sourceUrl: `https://example.com/${id}.jpg`,
      },
    },
  })

  it("eager loads and prioritizes the first two images", () => {
    render(<SecondaryStories posts={[createPost("one", "Story One"), createPost("two", "Story Two"), createPost("three", "Story Three")]} layout="horizontal" />)

    const firstImage = screen.getByAltText("Story One")
    const secondImage = screen.getByAltText("Story Two")
    const thirdImage = screen.getByAltText("Story Three")

    expect(firstImage.dataset.priority).toBe("true")
    expect(firstImage.dataset.loading).toBe("eager")

    expect(secondImage.dataset.priority).toBe("true")
    expect(secondImage.dataset.loading).toBe("eager")

    expect(thirdImage.dataset.priority).toBe("false")
    expect(thirdImage.dataset.loading).toBe("lazy")

    expect(firstImage.dataset.sizes).toBe("(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw")
    expect(firstImage.dataset.placeholder).toBe("blur")
    expect(firstImage.dataset.hasBlur).toBe("true")
  })
})

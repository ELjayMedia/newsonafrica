import { render } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { SecondaryStories } from "../SecondaryStories"

const articleCardMock = vi.fn()

vi.mock("@/components/ArticleCard", () => ({
  ArticleCard: (props: any) => {
    articleCardMock(props)
    return <div data-testid="article-card" />
  },
}))

describe("SecondaryStories", () => {
  const createPost = (id: string, title: string) => ({
    id,
    title,
    slug: `${id}-slug`,
    date: new Date().toISOString(),
    country: "ng",
    featuredImage: {
      node: {
        sourceUrl: `https://example.com/${id}.jpg`,
      },
    },
  })

  beforeEach(() => {
    articleCardMock.mockClear()
  })

  it("prioritizes the first two secondary stories in horizontal layout", () => {
    render(
      <SecondaryStories
        posts={[createPost("one", "Story One"), createPost("two", "Story Two"), createPost("three", "Story Three")]}
        layout="horizontal"
      />,
    )

    expect(articleCardMock).toHaveBeenCalledTimes(3)

    const firstCall = articleCardMock.mock.calls[0][0]
    const secondCall = articleCardMock.mock.calls[1][0]
    const thirdCall = articleCardMock.mock.calls[2][0]

    expect(firstCall.layout).toBe("horizontal")
    expect(secondCall.layout).toBe("horizontal")
    expect(thirdCall.layout).toBe("horizontal")

    expect(firstCall.priority).toBe(true)
    expect(secondCall.priority).toBe(true)
    expect(thirdCall.priority).toBe(false)

    expect(firstCall.article).toMatchObject({ slug: "one-slug", country: "ng" })
    expect(secondCall.article).toMatchObject({ slug: "two-slug", country: "ng" })
    expect(thirdCall.article).toMatchObject({ slug: "three-slug", country: "ng" })
  })

  it("uses the compact article card for vertical layout", () => {
    render(
      <SecondaryStories
        posts={[createPost("one", "Story One"), createPost("two", "Story Two")]}
        layout="vertical"
      />,
    )

    expect(articleCardMock).toHaveBeenCalledTimes(2)
    articleCardMock.mock.calls.forEach((call: any[]) => {
      const props = call[0]
      expect(props.layout).toBe("compact")
      expect(props.priority).toBe(true)
      expect(props.showExcerpt).toBe(false)
    })
  })
})

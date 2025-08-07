import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { PostArticleCards } from "@/components/PostArticleCards"

// Mock next/image to behave like a standard img tag
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, ...rest } = props
    return React.createElement("img", { src, alt, ...rest })
  },
}))

// Mock next/link to render a simple anchor
jest.mock("next/link", () => {
  return ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
})

describe("PostArticleCards", () => {
  it("renders article cards with timestamp and live badge", () => {
    const articles = [
      { id: 1, title: "Article 1", href: "/a1", timestamp: "2h ago", thumbnailUrl: null },
      { id: 2, title: "Article 2", href: "/a2", timestamp: "5m ago", thumbnailUrl: "/img.jpg", tag: "LIVE" },
    ]

    render(<PostArticleCards articles={articles} />)

    expect(screen.getByText("Article 1")).toBeInTheDocument()
    expect(screen.getByText("2h ago")).toBeInTheDocument()
    expect(screen.getByText("LIVE")).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(2)
    expect(screen.getAllByRole("img")).toHaveLength(1)
  })
})


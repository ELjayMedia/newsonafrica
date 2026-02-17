import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { renderRichTextComment } from "@/lib/comments/rich-text-renderer"
import { isAllowedHttpUrl, validateRichTextFormatting } from "@/lib/comments/rich-text"
import { validateCreateCommentPayload } from "@/lib/comments/validators"

describe("rich text security", () => {
  it("does not render raw script tags as HTML", () => {
    render(<div>{renderRichTextComment("Hello <script>alert('xss')</script>")}</div>)

    expect(screen.getByText("Hello <script>alert('xss')</script>")).toBeInTheDocument()
    expect(document.querySelector("script")).toBeNull()
  })

  it("only allows http/https protocols for markdown links", () => {
    render(<div>{renderRichTextComment("[safe](https://example.com) [bad](javascript:alert(1))")}</div>)

    const safeLink = screen.getByRole("link", { name: "safe" })
    expect(safeLink).toHaveAttribute("href", "https://example.com")
    expect(screen.queryByRole("link", { name: "bad" })).not.toBeInTheDocument()
    expect(screen.getByText("[bad](javascript:alert(1))")).toBeInTheDocument()
  })

  it("rejects disallowed rich text formatting server-side", () => {
    expect(validateRichTextFormatting("<img src=x onerror=alert(1) />")).toContain("raw HTML")
    expect(validateRichTextFormatting("[bad](javascript:alert(1))")).toContain("http:// or https://")
  })

  it("rejects rich text payloads with script tags during create validation", () => {
    expect(() =>
      validateCreateCommentPayload({
        wp_post_id: "post-1",
        edition_code: "ng",
        body: "<script>alert('xss')</script>",
        is_rich_text: true,
      }),
    ).toThrowError("Invalid comment payload")
  })

  it("allows only explicit http/https links", () => {
    expect(isAllowedHttpUrl("https://example.com/path")).toBe(true)
    expect(isAllowedHttpUrl("http://example.com/path")).toBe(true)
    expect(isAllowedHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isAllowedHttpUrl("/relative-path")).toBe(false)
  })
})

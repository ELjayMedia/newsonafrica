import { describe, expect, it } from "vitest"

import { sanitizeExcerpt } from "./sanitizeExcerpt"

describe("sanitizeExcerpt", () => {
  it("strips paragraph tags from excerpts", () => {
    const result = sanitizeExcerpt("<p>Hello world</p>")

    expect(result).toBe("Hello world")
  })

  it("decodes HTML entities like &#39; into plain text", () => {
    const result = sanitizeExcerpt("Today&#39;s highlights")

    expect(result).toBe("Today's highlights")
  })

  it("normalizes whitespace when removing tags", () => {
    const result = sanitizeExcerpt("<p>Hello</p><p>World</p>")

    expect(result).toBe("Hello World")
  })
})


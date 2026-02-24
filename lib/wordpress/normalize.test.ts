import { vi } from "vitest"

vi.mock("server-only", () => ({}))

import { describe, expect, it } from "vitest"

import { normalizePostContent } from "@/lib/wordpress/normalize"

describe("normalizePostContent", () => {
  it("sanitizes script tags and preserves safe markup", () => {
    const html = '<p>Hello</p><script>alert(1)</script><iframe src="https://www.youtube.com/embed/abc"></iframe>'

    const result = normalizePostContent(html, "sz")

    expect(result).toContain("<p>Hello</p>")
    expect(result).not.toContain("<script")
  })
})

import { describe, expect, it } from "vitest"

import { sanitizeArticleHtml } from "@/lib/utils/sanitize-article-html"

describe("sanitizeArticleHtml", () => {
  it("removes most read blocks from article body HTML", () => {
    const html = `
      <p>Lead paragraph</p>
      <section class="article-most-read most-read">
        <h2>Most Read</h2>
        <ul><li>Story one</li><li>Story two</li></ul>
      </section>
      <p>Closing paragraph</p>
    `

    const result = sanitizeArticleHtml(html)

    expect(result).not.toContain("Most Read")
    expect(result).not.toContain("article-most-read")
    expect(result).toContain("Lead paragraph")
    expect(result).toContain("Closing paragraph")
  })

  it("removes paragraph-based most read widgets", () => {
    const html = `
      <p>Intro</p>
      <p><strong>Most Read</strong></p>
      <p><a href="/article/1">Story one</a></p>
      <p><a href="/article/2">Story two</a></p>
      <p><a href="/article/3">Story three</a></p>
      <p>Outro</p>
    `

    const result = sanitizeArticleHtml(html)

    expect(result).toContain("Intro")
    expect(result).toContain("Outro")
    expect(result).not.toContain("<strong>Most Read</strong>")
    expect(result).not.toContain("/article/1")
    expect(result).not.toContain("/article/2")
    expect(result).not.toContain("/article/3")
  })
})

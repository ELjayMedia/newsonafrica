import { describe, it, expect } from 'vitest'
import { rewriteLegacyLinks, isLegacyPostUrl, convertLegacyUrl } from './routing'

const country = 'za'

describe('rewriteLegacyLinks', () => {
  it('rewrites relative legacy links', () => {
    const html = '<a href="/post/sample-article">Read</a>'
    const result = rewriteLegacyLinks(html, country)
    expect(result).toBe(`<a href="/${country}/article/sample-article">Read</a>`)
  })

  it('rewrites absolute legacy links', () => {
    const html = '<a href="https://example.com/post/sample-article">Read</a>'
    const result = rewriteLegacyLinks(html, country)
    expect(result).toBe(`<a href="/${country}/article/sample-article">Read</a>`)
  })

  it('leaves non-legacy links untouched', () => {
    const html = '<a href="/category/news">News</a>'
    const result = rewriteLegacyLinks(html, country)
    expect(result).toBe(html)
  })
})

describe('legacy url helpers', () => {
  it('detects legacy post urls correctly', () => {
    expect(isLegacyPostUrl('/post/sample-article')).toBe(true)
    expect(isLegacyPostUrl('/za/article/sample-article')).toBe(false)
  })

  it('converts legacy urls while leaving modern urls untouched', () => {
    expect(convertLegacyUrl('/post/sample-article', country)).toBe(
      `/${country}/article/sample-article`
    )
    expect(convertLegacyUrl(`/${country}/article/sample-article`, country)).toBe(
      `/${country}/article/sample-article`
    )
  })
})

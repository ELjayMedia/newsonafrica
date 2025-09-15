import { describe, it, expect } from 'vitest'
import { convertLegacyUrl, rewriteLegacyLinks } from './routing'

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

describe('convertLegacyUrl', () => {
  it('converts relative legacy URL', () => {
    const result = convertLegacyUrl('/post/sample-article', country)
    expect(result).toBe(`/${country}/article/sample-article`)
  })

  it('converts absolute legacy URL', () => {
    const result = convertLegacyUrl('https://example.com/post/sample-article', country)
    expect(result).toBe(`https://example.com/${country}/article/sample-article`)

  })
})

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  vi,
} from 'vitest'

let convertLegacyUrl: typeof import('./routing').convertLegacyUrl
let rewriteLegacyLinks: typeof import('./routing').rewriteLegacyLinks
let getArticleUrl: typeof import('./routing').getArticleUrl
let getCategoryUrl: typeof import('./routing').getCategoryUrl
let getCurrentCountry: typeof import('./routing').getCurrentCountry
let DEFAULT_COUNTRY: typeof import('./routing').DEFAULT_COUNTRY

beforeAll(async () => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_DEFAULT_SITE', 'ZA')
  const routingModule = await vi.importActual<typeof import('./routing')>('./routing')
  convertLegacyUrl = routingModule.convertLegacyUrl
  rewriteLegacyLinks = routingModule.rewriteLegacyLinks
  getArticleUrl = routingModule.getArticleUrl
  getCategoryUrl = routingModule.getCategoryUrl
  getCurrentCountry = routingModule.getCurrentCountry
  DEFAULT_COUNTRY = routingModule.DEFAULT_COUNTRY
  vi.unstubAllEnvs()
})

const resetClientState = () => {
  window.history.pushState({}, '', '/')
  window.localStorage.clear()
  document.cookie = 'country=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  document.cookie = 'preferredCountry=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

describe('getCurrentCountry', () => {
  beforeEach(() => {
    resetClientState()
  })

  afterEach(() => {
    resetClientState()
  })

  it('returns the country from a provided pathname', () => {
    expect(getCurrentCountry('/za/news')).toBe('za')
  })

  it('derives the country from the current window location when no pathname is supplied', () => {
    window.history.pushState({}, '', '/za/category/news')
    expect(getCurrentCountry()).toBe('za')
  })

  it('prefers the country cookie before legacy storage', () => {
    document.cookie = 'country=za; path=/'
    document.cookie = 'preferredCountry=sz; path=/'
    window.localStorage.setItem('preferredCountry', 'sz')

    expect(getCurrentCountry()).toBe('za')
  })

  it('supports the legacy preferredCountry cookie as a fallback', () => {
    document.cookie = 'preferredCountry=za; path=/'
    expect(getCurrentCountry()).toBe('za')
  })

  it('falls back to local storage when no path or cookie is present', () => {
    window.localStorage.setItem('preferredCountry', 'za')
    expect(getCurrentCountry()).toBe('za')
  })

  it('returns the default country when no sources resolve', () => {
    expect(getCurrentCountry()).toBe(DEFAULT_COUNTRY)
  })
})

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

  it('returns original URL when not legacy', () => {
    const url = '/category/news'
    expect(convertLegacyUrl(url, country)).toBe(url)
  })
})

describe('URL generators', () => {
  it('builds article URL for provided country', () => {
    expect(getArticleUrl('story', country)).toBe(`/${country}/article/story`)
  })

  it('builds category URL for provided country', () => {
    expect(getCategoryUrl('news', country)).toBe(`/${country}/category/news`)
  })
})

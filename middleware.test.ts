import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import * as routing from '@/lib/utils/routing'
import { middleware } from './middleware'

describe('middleware legacy post redirect', () => {
  it('redirects to country-specific article when preferredCountry cookie is set', () => {
    vi.spyOn(routing, 'getServerCountry').mockReturnValue('za')

    const slug = 'sample-post'
    const url = `https://example.com/post/${slug}`
    const request = new NextRequest(url, {
      headers: { cookie: 'preferredCountry=za' },
    })

    const response = middleware(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(`https://example.com/za/article/${slug}`)
  })

  it('falls back to default country when no cookie is present', () => {
    vi.spyOn(routing, 'getServerCountry').mockReturnValue('')
    const slug = 'another-post'
    const request = new NextRequest(`https://example.com/post/${slug}`)
    const response = middleware(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(`https://example.com/sz/article/${slug}`)
  })

  it('redirects legacy category routes', () => {
    const request = new NextRequest('https://example.com/news')
    const response = middleware(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('https://example.com/sz/category/news')
  })
})

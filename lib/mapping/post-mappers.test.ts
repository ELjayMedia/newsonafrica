import { describe, expect, it } from 'vitest'

import { mapWordPressPostFromSource } from '@/lib/mapping/post-mappers'

const countryCode = 'za'

describe('mapWordPressPostFromSource', () => {
  it('normalizes REST posts with rendered text fields', () => {
    const restPost = {
      id: 42,
      title: { rendered: 'Rendered title' },
      excerpt: { rendered: 'Rendered excerpt' },
      content: { rendered: '<p>Rendered content</p>' },
    }

    const result = mapWordPressPostFromSource(restPost as any, 'rest', countryCode)

    expect(result.title).toBe('Rendered title')
    expect(typeof result.title).toBe('string')
    expect(result.excerpt).toBe('Rendered excerpt')
    expect(typeof result.excerpt).toBe('string')
    expect(result.content).toBe('<p>Rendered content</p>')
    expect(typeof result.content).toBe('string')
  })
})

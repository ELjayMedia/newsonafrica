import { generateBlurDataURL } from '../lazyLoad'

describe('generateBlurDataURL', () => {
  it('should start with data:image/svg+xml;base64,', () => {
    const result = generateBlurDataURL(100, 100)
    expect(result.startsWith('data:image/svg+xml;base64,')).toBe(true)
  })
})

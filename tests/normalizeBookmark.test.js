const assert = require('assert')
const { normalizeBookmark } = require('../utils/normalizeBookmark')

const sample = { featuredImage: '{"url":"image.jpg"}', other: 'data' }
const result = normalizeBookmark({ ...sample })
assert.strictEqual(typeof result.featuredImage, 'object')
assert.strictEqual(result.featuredImage.url, 'image.jpg')
console.log('normalizeBookmark test passed')

const assert = require('assert')

function normalizeBookmarks(data = []) {
  return data.map((bookmark) => ({
    ...bookmark,
    featuredImage:
      typeof bookmark.featuredImage === 'string'
        ? JSON.parse(bookmark.featuredImage)
        : bookmark.featuredImage,
  }))
}

const input = [{ featuredImage: '{"src":"image.jpg"}', other: 'data' }]
const result = normalizeBookmarks(input)
assert.strictEqual(typeof result[0].featuredImage, 'object', 'featuredImage should be object')
console.log('Test passed')

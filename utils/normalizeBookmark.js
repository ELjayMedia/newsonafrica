export function normalizeBookmark(b) {
  if (b && typeof b.featuredImage === 'string') {
    try {
      b.featuredImage = JSON.parse(b.featuredImage)
    } catch {
      // ignore parse errors
    }
  }
  return b
}

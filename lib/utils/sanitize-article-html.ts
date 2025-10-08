import DOMPurify from 'isomorphic-dompurify'

export function sanitizeArticleHtml(html: string): string {
  if (!html) {
    return ''
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  })
}

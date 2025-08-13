/**
 * Very small HTML sanitizer for WordPress content.
 * Strips <script> tags and dangerous event handler attributes.
 * This is not a full sanitizer but provides a minimal allowlist.
 */
export function cleanHtml(html: string): string {
  if (!html) return '';
  // remove script tags completely
  let out = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  // remove on* attributes (onclick, onerror, etc)
  out = out.replace(/ on[a-z]+="[^"]*"/gi, '');
  out = out.replace(/ on[a-z]+='[^']*'/gi, '');
  // remove javascript: URLs
  out = out.replace(/ href="javascript:[^"]*"/gi, '');
  out = out.replace(/ href='javascript:[^']*'/gi, '');
  return out;
}

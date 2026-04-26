import { parse, type HTMLElement, type Node } from "node-html-parser"

// Tags that may appear in article bodies.
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "del", "ins",
  "a", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "code", "pre",
  "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "div", "span", "section", "article", "aside",
  "iframe", "hr", "sup", "sub", "abbr", "cite",
])

// Tags that must never appear even with children preserved.
const STRIP_TAGS = new Set([
  "script", "style", "meta", "link", "object", "embed",
  "base", "form", "input", "button", "select", "textarea",
])

// Void elements (no closing tag, no children).
const VOID_TAGS = new Set(["br", "hr", "img", "source"])

// Per-tag attribute allowlists. "class" is allowed on every element.
const TAG_ATTRS: Record<string, Set<string>> = {
  a:       new Set(["href", "title", "target", "rel"]),
  img:     new Set(["src", "alt", "title", "width", "height", "loading", "decoding", "srcset", "sizes"]),
  iframe:  new Set(["src", "title", "width", "height", "allow", "allowfullscreen", "frameborder", "scrolling"]),
  td:      new Set(["colspan", "rowspan"]),
  th:      new Set(["colspan", "rowspan", "scope"]),
  abbr:    new Set(["title"]),
  time:    new Set(["datetime"]),
}

const SAFE_URL = /^(https?:|\/(?!\/)|#)/i

function buildSafeAttrs(tag: string, attrs: Record<string, string>): string {
  const allowed = TAG_ATTRS[tag]
  const parts: string[] = []

  for (const [rawKey, value] of Object.entries(attrs)) {
    const key = rawKey.toLowerCase()

    if (key.startsWith("on")) continue                                     // strip event handlers
    if (key !== "class" && (!allowed || !allowed.has(key))) continue       // not in allowlist
    if ((key === "href" || key === "src") && !SAFE_URL.test(value.trim())) continue // unsafe URL

    parts.push(`${key}="${value.replace(/"/g, "&quot;")}"`)
  }

  return parts.length ? " " + parts.join(" ") : ""
}

function sanitizeNode(node: Node): string {
  // Text nodes: preserve raw source (entities already encoded by parser).
  if (node.nodeType === 3) return node.toString()

  const el = node as HTMLElement
  const tag = el.rawTagName?.toLowerCase()

  if (!tag) return ""

  if (STRIP_TAGS.has(tag)) return ""

  const children = el.childNodes.map(sanitizeNode).join("")

  if (!ALLOWED_TAGS.has(tag)) {
    // Unwrap: keep children, discard the wrapper element.
    return children
  }

  const attrs = buildSafeAttrs(tag, el.attrs ?? {})

  if (VOID_TAGS.has(tag)) return `<${tag}${attrs}>`

  return `<${tag}${attrs}>${children}</${tag}>`
}

const MOST_READ_CLASS_BLOCK_REGEX =
  /<(section|div|aside)\b[^>]*class\s*=\s*("|')[^"']*most-read[^"']*\2[^>]*>[\s\S]*?<\/\1>/gi
const MOST_READ_SECTION_WITH_HEADING_REGEX =
  /<(section|div|aside)\b[^>]*>[\s\S]*?<h[1-6]\b[^>]*>\s*Most\s*Read\s*<\/h[1-6]>[\s\S]*?<\/\1>/gi
const MOST_READ_HEADING_AND_LIST_REGEX =
  /<h[1-6]\b[^>]*>\s*Most\s*Read\s*<\/h[1-6]>\s*(<(ul|ol)\b[^>]*>[\s\S]*?<\/(ul|ol)>\s*)?/gi
const MOST_READ_PARAGRAPH_LINK_BLOCK_REGEX =
  /<p\b[^>]*>\s*(?:<strong>|<b>)?\s*Most\s*Read\s*(?:<\/strong>|<\/b>)?\s*<\/p>\s*(?:<p\b[^>]*>\s*<a\b[^>]*>[\s\S]*?<\/a>\s*<\/p>\s*){1,12}/gi

export function sanitizeArticleHtml(html: string): string {
  if (!html) return ""

  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
    blockTextElements: { script: false, style: false },
  })

  const clean = root.childNodes.map(sanitizeNode).join("")

  // Strip WordPress "Most Read" promotional blocks that have no place in
  // the article body.
  return clean
    .replace(MOST_READ_CLASS_BLOCK_REGEX, "")
    .replace(MOST_READ_SECTION_WITH_HEADING_REGEX, "")
    .replace(MOST_READ_HEADING_AND_LIST_REGEX, "")
    .replace(MOST_READ_PARAGRAPH_LINK_BLOCK_REGEX, "")
}

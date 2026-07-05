import "server-only";

import { decodeHtmlEntities } from "@/lib/wordpress/html";

const RAW_TEXT_TAG_REGEX = /<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const COMMENT_REGEX = /<!--[\s\S]*?-->/g;
const TAG_REGEX = /<\/?([a-zA-Z][\w:-]*)(\s[^<>]*)?>/g;
const ATTR_REGEX = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "iframe",
  "code",
  "pre",
  "span",
  "div",
  "sup",
  "sub",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);

const ALLOWED_ATTR = new Set([
  "href",
  "src",
  "alt",
  "title",
  "class",
  "target",
  "rel",
  "width",
  "height",
  "loading",
  "allow",
  "allowfullscreen",
  "frameborder",
  "srcset",
  "sizes",
]);

const URL_ATTRS = new Set(["href", "src"]);
const BOOLEAN_ATTRS = new Set(["allowfullscreen"]);

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeUrlForSafety(value: string): string {
  return decodeHtmlEntities(value)
    .trim()
    .replace(/[\u0000-\u001F\u007F\s]+/g, "")
    .toLowerCase();
}

function isSafeUrl(value: string, attrName: string): boolean {
  const normalized = normalizeUrlForSafety(value);
  if (!normalized) return false;

  if (
    normalized.startsWith("#") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("//")
  ) {
    return true;
  }

  return attrName === "href" && (normalized.startsWith("mailto:") || normalized.startsWith("tel:"));
}

function isSafeSrcSet(value: string): boolean {
  return value.split(",").every((candidate) => {
    const [url] = candidate.trim().split(/\s+/);
    return Boolean(url) && isSafeUrl(url, "src");
  });
}

function sanitizeAttributes(tagName: string, rawAttributes = ""): string {
  const attributes: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = ATTR_REGEX.exec(rawAttributes)) !== null) {
    const rawName = match[1];
    if (!rawName) continue;

    const name = rawName.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];

    if (seen.has(name) || name.startsWith("on") || !ALLOWED_ATTR.has(name)) continue;
    if (tagName !== "a" && name === "target") continue;
    if (name === "srcset" && (value === undefined || !isSafeSrcSet(value))) continue;
    if (URL_ATTRS.has(name) && (value === undefined || !isSafeUrl(value, name))) continue;
    if (name === "loading" && value && !["eager", "lazy"].includes(value.toLowerCase())) continue;
    if (BOOLEAN_ATTRS.has(name) && value === undefined) {
      attributes.push(name);
      seen.add(name);
      continue;
    }
    if (value === undefined) continue;

    attributes.push(`${name}="${escapeAttribute(value)}"`);
    seen.add(name);
  }

  if (tagName === "a" && attributes.some((attr) => attr.startsWith("target=\"_blank\"")) && !seen.has("rel")) {
    attributes.push('rel="noopener noreferrer"');
  }

  return attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
}

/**
 * Sanitize rendered WordPress post HTML for safe `dangerouslySetInnerHTML` use.
 *
 * Keep this dependency-free. The previous DOMPurify/jsdom path pulled an ESM-only
 * transitive module through CommonJS on Vercel, crashing article routes after
 * WordPress content was fetched but before it could render.
 */
export function sanitizeArticleHtml(html: string): string {
  if (!html) return "";

  return html
    .replace(RAW_TEXT_TAG_REGEX, "")
    .replace(COMMENT_REGEX, "")
    .replace(TAG_REGEX, (rawTag, rawTagName: string, rawAttributes: string | undefined) => {
      const tagName = rawTagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tagName)) return "";

      const isClosingTag = /^<\s*\//.test(rawTag);
      if (isClosingTag) return VOID_TAGS.has(tagName) ? "" : `</${tagName}>`;

      const attributes = sanitizeAttributes(tagName, rawAttributes);
      return `<${tagName}${attributes}>`;
    });
}

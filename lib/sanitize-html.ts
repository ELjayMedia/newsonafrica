/**
 * Sanitizes WordPress `content.rendered` HTML before it's dropped into the
 * page via `dangerouslySetInnerHTML` (NOA-90). The DAL documents `Post.content`
 * as "safe to dangerouslySetInnerHTML" but that's aspirational, not actually
 * enforced upstream — WordPress editors/plugins can emit arbitrary markup
 * (embeds, inline scripts/styles, event handler attributes), so the article
 * route sanitizes at render time rather than trusting the CMS.
 *
 * Server-only: DOMPurify runs against a jsdom window on the server via
 * `isomorphic-dompurify`, which is heavier than we want in a client bundle.
 */
import "server-only";

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
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
];

const ALLOWED_ATTR = [
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
];

/** Sanitize rendered WordPress post HTML for safe `dangerouslySetInnerHTML` use. */
export function sanitizeArticleHtml(html: string): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Embedded video/social embeds (YouTube, Twitter, etc.) rely on iframes.
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder"],
  });
}

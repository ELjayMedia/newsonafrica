import { describe, expect, it } from "vitest";

import { sanitizeArticleHtml } from "@/lib/sanitize-html";

describe("sanitizeArticleHtml", () => {
  it("keeps common WordPress article markup", () => {
    const html = [
      '<p class="lead">Hello <strong>Africa</strong></p>',
      '<figure><img src="https://newsonafrica.com/image.jpg" alt="Story image" loading="lazy"><figcaption>Caption</figcaption></figure>',
      '<iframe src="https://www.youtube.com/embed/example" allowfullscreen></iframe>',
    ].join("");

    expect(sanitizeArticleHtml(html)).toBe(
      '<p class="lead">Hello <strong>Africa</strong></p>' +
        '<figure><img src="https://newsonafrica.com/image.jpg" alt="Story image" loading="lazy"><figcaption>Caption</figcaption></figure>' +
        '<iframe src="https://www.youtube.com/embed/example" allowfullscreen></iframe>',
    );
  });

  it("removes scripts, event handlers and unsafe URLs", () => {
    const html = '<p onclick="alert(1)">Hi<script>alert(1)</script><a href="javascript:alert(1)" target="_blank">bad</a></p>';

    expect(sanitizeArticleHtml(html)).toBe('<p>Hi<a target="_blank" rel="noopener noreferrer">bad</a></p>');
  });

  it("removes encoded javascript URLs", () => {
    const html = '<a href="jav&#x61;script:alert(1)">bad</a>';

    expect(sanitizeArticleHtml(html)).toBe("<a>bad</a>");
  });

  it("drops unsupported wrapper tags but preserves article text", () => {
    const html = '<section><p>Story body</p><custom-element data-x="1">extra</custom-element></section>';

    expect(sanitizeArticleHtml(html)).toBe("<p>Story body</p>extra");
  });
});

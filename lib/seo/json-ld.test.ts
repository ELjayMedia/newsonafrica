import { describe, expect, it } from "vitest";

import {
  breadcrumbJsonLd,
  newsArticleJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  webSiteJsonLd,
} from "@/lib/seo/json-ld";

// From vitest.config.ts env: SITE_URL=http://localhost:3000.
const BASE = "http://localhost:3000";

describe("serializeJsonLd", () => {
  it("escapes HTML-significant characters so CMS strings cannot close the script tag", () => {
    const out = serializeJsonLd({ headline: '</script><script>alert("x")</script> & <b>' });

    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(out).toContain("\\u003c/script\\u003e");

    // Still valid JSON that round-trips to the original string.
    expect(JSON.parse(out)).toEqual({ headline: '</script><script>alert("x")</script> & <b>' });
  });
});

describe("organizationJsonLd / webSiteJsonLd", () => {
  it("builds a NewsMediaOrganization with an absolute logo URL", () => {
    const org = organizationJsonLd();

    expect(org["@type"]).toBe("NewsMediaOrganization");
    expect(org.name).toBe("News on Africa");
    expect(org.url).toBe(BASE);
    expect(org.logo.url).toBe(`${BASE}/icons/icon-512.png`);
  });

  it("builds a WebSite with a SearchAction and a publisher reference", () => {
    const site = webSiteJsonLd();

    expect(site["@type"]).toBe("WebSite");
    expect(site.publisher).toEqual({ "@id": `${BASE}/#organization` });
    expect(site.potentialAction.target.urlTemplate).toBe(`${BASE}/search?q={search_term_string}`);
  });
});

describe("newsArticleJsonLd", () => {
  const input = {
    path: "/sz/article/big-story",
    title: "Big story",
    description: "Something happened.",
    publishedAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-02T09:00:00Z",
    imageUrl: "https://cms.example/image.jpg",
    author: { name: "Jane Writer", path: "/sz/author/jane-writer" },
    section: "Politics",
    keywords: ["economy", "energy"],
  };

  it("builds a complete NewsArticle node", () => {
    const article = newsArticleJsonLd(input);

    expect(article).toMatchObject({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: "Big story",
      description: "Something happened.",
      url: `${BASE}/sz/article/big-story`,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE}/sz/article/big-story` },
      datePublished: "2026-07-01T10:00:00Z",
      dateModified: "2026-07-02T09:00:00Z",
      image: ["https://cms.example/image.jpg"],
      author: { "@type": "Person", name: "Jane Writer", url: `${BASE}/sz/author/jane-writer` },
      articleSection: "Politics",
      keywords: "economy, energy",
      isAccessibleForFree: true,
    });
    expect(article.publisher.logo.url).toBe(`${BASE}/icons/icon-512.png`);
  });

  it("omits optional fields and falls back dateModified to datePublished", () => {
    const article = newsArticleJsonLd({
      path: "/sz/article/bare",
      title: "Bare",
      publishedAt: "2026-07-01T10:00:00Z",
    });

    expect(article.dateModified).toBe("2026-07-01T10:00:00Z");
    expect(article).not.toHaveProperty("description");
    expect(article).not.toHaveProperty("image");
    expect(article).not.toHaveProperty("author");
    expect(article).not.toHaveProperty("articleSection");
    expect(article).not.toHaveProperty("keywords");
  });
});

describe("breadcrumbJsonLd", () => {
  it("builds 1-based positions and omits item on path-less crumbs", () => {
    const breadcrumb = breadcrumbJsonLd([
      { name: "Eswatini", path: "/sz" },
      { name: "Politics", path: "/sz/category/politics" },
      { name: "Big story" },
    ]);

    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Eswatini", item: `${BASE}/sz` },
      { "@type": "ListItem", position: 2, name: "Politics", item: `${BASE}/sz/category/politics` },
      { "@type": "ListItem", position: 3, name: "Big story" },
    ]);
  });
});

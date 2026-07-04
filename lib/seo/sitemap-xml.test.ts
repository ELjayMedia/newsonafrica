import { describe, expect, it } from "vitest";

import {
  NEWS_NAMESPACE,
  NEWS_SITEMAP_MAX_URLS,
  NEWS_SITEMAP_WINDOW_MS,
  SITEMAP_NAMESPACE,
  buildNewsSitemapXml,
  buildSitemapIndexXml,
  buildUrlsetXml,
  escapeXml,
  toLastmod,
  toPlainText,
} from "@/lib/seo/sitemap-xml";

describe("escapeXml", () => {
  it("escapes the five XML special characters", () => {
    expect(escapeXml(`Tom & Jerry <win> "again" 'yes'`)).toBe(
      "Tom &amp; Jerry &lt;win&gt; &quot;again&quot; &apos;yes&apos;",
    );
  });
});

describe("toPlainText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(toPlainText("  <b>Breaking:</b>\n  new   story ")).toBe("Breaking: new story");
  });
});

describe("toLastmod", () => {
  it("normalizes valid dates to ISO 8601", () => {
    expect(toLastmod("2026-07-01T10:00:00+02:00")).toBe("2026-07-01T08:00:00.000Z");
  });

  it("returns undefined for missing or invalid dates", () => {
    expect(toLastmod(null)).toBeUndefined();
    expect(toLastmod(undefined)).toBeUndefined();
    expect(toLastmod("not-a-date")).toBeUndefined();
  });
});

describe("buildUrlsetXml", () => {
  it("emits a urlset with loc, lastmod, changefreq and priority", () => {
    const xml = buildUrlsetXml([
      {
        loc: "https://example.com/sz/article/a?x=1&y=2",
        lastmod: "2026-07-01T08:00:00.000Z",
        changefreq: "weekly",
        priority: 0.7,
      },
      { loc: "https://example.com/sz" },
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(`<urlset xmlns="${SITEMAP_NAMESPACE}">`);
    expect(xml).toContain("<loc>https://example.com/sz/article/a?x=1&amp;y=2</loc>");
    expect(xml).toContain("<lastmod>2026-07-01T08:00:00.000Z</lastmod>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain("<priority>0.7</priority>");
    // Optional fields are omitted, not emitted empty.
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
  });
});

describe("buildSitemapIndexXml", () => {
  it("emits a sitemapindex of child sitemaps", () => {
    const xml = buildSitemapIndexXml([
      { loc: "https://example.com/sitemaps/sz/articles-1.xml", lastmod: "2026-07-01T08:00:00.000Z" },
      { loc: "https://example.com/news-sitemap/sz" },
    ]);

    expect(xml).toContain(`<sitemapindex xmlns="${SITEMAP_NAMESPACE}">`);
    expect(xml).toContain("<loc>https://example.com/sitemaps/sz/articles-1.xml</loc>");
    expect(xml).toContain("<loc>https://example.com/news-sitemap/sz</loc>");
    expect(xml.match(/<sitemap>/g)).toHaveLength(2);
  });
});

describe("buildNewsSitemapXml", () => {
  const publication = { name: "News on Africa", language: "en" };

  it("emits the Google News namespace and publication metadata", () => {
    const xml = buildNewsSitemapXml(
      [
        {
          loc: "https://example.com/sz/article/big-story",
          title: "<b>Big</b> story &amp; more",
          publicationDate: "2026-07-02T12:00:00.000Z",
          keywords: ["Politics", " Business "],
        },
      ],
      publication,
    );

    expect(xml).toContain(`xmlns:news="${NEWS_NAMESPACE}"`);
    expect(xml).toContain("<news:name>News on Africa</news:name>");
    expect(xml).toContain("<news:language>en</news:language>");
    expect(xml).toContain("<news:publication_date>2026-07-02T12:00:00.000Z</news:publication_date>");
    expect(xml).toContain("<news:title>Big story &amp;amp; more</news:title>");
    expect(xml).toContain("<news:keywords>Politics, Business</news:keywords>");
  });

  it("omits keywords when none are provided", () => {
    const xml = buildNewsSitemapXml(
      [{ loc: "https://example.com/a", title: "A", publicationDate: "2026-07-02T12:00:00.000Z" }],
      publication,
    );
    expect(xml).not.toContain("<news:keywords>");
  });

  it("drops entries with an empty title or invalid publication date", () => {
    const xml = buildNewsSitemapXml(
      [
        { loc: "https://example.com/a", title: "<i> </i>", publicationDate: "2026-07-02T12:00:00.000Z" },
        { loc: "https://example.com/b", title: "Valid", publicationDate: "nope" },
        { loc: "https://example.com/c", title: "Kept", publicationDate: "2026-07-02T12:00:00.000Z" },
      ],
      publication,
    );

    expect(xml.match(/<url>/g)).toHaveLength(1);
    expect(xml).toContain("https://example.com/c");
  });

  it("caps output at the spec's 1,000 URLs", () => {
    const entries = Array.from({ length: NEWS_SITEMAP_MAX_URLS + 5 }, (_, index) => ({
      loc: `https://example.com/sz/article/story-${index}`,
      title: `Story ${index}`,
      publicationDate: "2026-07-02T12:00:00.000Z",
    }));

    const xml = buildNewsSitemapXml(entries, publication);
    expect(xml.match(/<url>/g)).toHaveLength(NEWS_SITEMAP_MAX_URLS);
  });

  it("uses a 48 hour freshness window constant", () => {
    expect(NEWS_SITEMAP_WINDOW_MS).toBe(48 * 60 * 60 * 1000);
  });
});

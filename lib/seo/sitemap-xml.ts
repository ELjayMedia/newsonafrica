/**
 * Pure XML builders for the sitemap surfaces (NOA-112/113): the sitemap
 * index, standard urlsets and the Google News urlset. No I/O and no
 * server-only imports so every branch is unit-testable
 * (`lib/seo/sitemap-xml.test.ts`); the route handlers under
 * `app/sitemap.xml`, `app/sitemaps` and `app/news-sitemap` do the data
 * fetching and hand plain entry objects to these builders.
 *
 * Modeled on the legacy implementation (`legacy/app/news-sitemap/utils.ts`)
 * but rewritten for this rebuild's types.
 */

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
export const SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
export const NEWS_NAMESPACE = "http://www.google.com/schemas/sitemap-news/0.9";

/** CDN caching for all sitemap/robots XML responses. */
export const SITEMAP_CACHE_CONTROL = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

/** Google News sitemaps must only contain articles from the last 48 hours. */
export const NEWS_SITEMAP_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Google News sitemaps are capped at 1,000 URLs by the spec. */
export const NEWS_SITEMAP_MAX_URLS = 1000;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Strip markup + collapse whitespace, for CMS-rendered titles. */
export function toPlainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize a date-ish string to ISO 8601, or `undefined` when invalid. */
export function toLastmod(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export interface SitemapUrlEntry {
  /** Absolute URL. */
  loc: string;
  /** ISO 8601 datetime (use `toLastmod`). */
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  /** 0.0–1.0 */
  priority?: number;
}

/** Standard `<urlset>` sitemap document. */
export function buildUrlsetXml(entries: SitemapUrlEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority !== undefined) parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `${XML_DECLARATION}\n<urlset xmlns="${SITEMAP_NAMESPACE}">\n${urls}\n</urlset>\n`;
}

export interface SitemapIndexEntry {
  /** Absolute URL of a child sitemap. */
  loc: string;
  lastmod?: string;
}

/** `<sitemapindex>` document pointing at the per-section sitemaps. */
export function buildSitemapIndexXml(entries: SitemapIndexEntry[]): string {
  const sitemaps = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      return `  <sitemap>\n${parts.join("\n")}\n  </sitemap>`;
    })
    .join("\n");

  return `${XML_DECLARATION}\n<sitemapindex xmlns="${SITEMAP_NAMESPACE}">\n${sitemaps}\n</sitemapindex>\n`;
}

export interface NewsSitemapEntry {
  /** Absolute article URL. */
  loc: string;
  /** Article headline (plain text; HTML is stripped defensively). */
  title: string;
  /** ISO 8601 first-publication datetime. */
  publicationDate: string;
  /** Optional comma-joined `<news:keywords>` source (e.g. category names). */
  keywords?: string[];
}

export interface NewsPublication {
  name: string;
  /** ISO 639 language code (e.g. "en"). */
  language: string;
}

/**
 * Google News `<urlset>` (news namespace). Entries with no usable title or
 * an invalid publication date are dropped rather than emitting invalid XML.
 */
export function buildNewsSitemapXml(entries: NewsSitemapEntry[], publication: NewsPublication): string {
  const urls = entries
    .slice(0, NEWS_SITEMAP_MAX_URLS)
    .map((entry) => {
      const title = toPlainText(entry.title);
      const publicationDate = toLastmod(entry.publicationDate);
      if (!title || !publicationDate || !entry.loc) return "";

      const keywords = (entry.keywords ?? []).map((keyword) => toPlainText(keyword)).filter(Boolean);
      const keywordsXml = keywords.length > 0 ? `\n      <news:keywords>${escapeXml(keywords.join(", "))}</news:keywords>` : "";

      return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(publication.name)}</news:name>
        <news:language>${escapeXml(publication.language)}</news:language>
      </news:publication>
      <news:publication_date>${publicationDate}</news:publication_date>
      <news:title>${escapeXml(title)}</news:title>${keywordsXml}
    </news:news>
  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  return `${XML_DECLARATION}\n<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:news="${NEWS_NAMESPACE}">\n${urls}\n</urlset>\n`;
}

/** Standard headers for an XML sitemap response. */
export function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}

/**
 * Sitemap index (NOA-112), served at `/sitemap.xml` and referenced from
 * `/robots.txt`.
 *
 * Architecture: one index → per-country section sitemaps
 * (`/sitemaps/{country}/{section}.xml`, see `app/sitemaps/.../route.ts`)
 * plus the per-country Google News sitemaps (`/news-sitemap/{country}`,
 * NOA-113). Article sitemaps are paginated (`articles-{n}.xml`,
 * ARTICLES_PER_SITEMAP urls each) sized from a cheap Supabase
 * `content_index` count; when the count is unavailable (Supabase down) we
 * still list page 1 per country so the index never 500s or goes empty.
 */
import { SUPPORTED_COUNTRY_CODES } from "@/lib/countries";
import { absoluteUrl } from "@/lib/seo/config";
import { ARTICLES_PER_SITEMAP, countSitemapArticles } from "@/lib/seo/sitemap-data";
import { buildSitemapIndexXml, xmlResponse, type SitemapIndexEntry } from "@/lib/seo/sitemap-xml";

// Rendered per request (article counts change constantly); freshness is
// balanced by the CDN Cache-Control header from `xmlResponse`. Without this
// the handler is prerendered once at build time — against an empty database.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const lastmod = new Date().toISOString();

  const countryEntries = await Promise.all(
    SUPPORTED_COUNTRY_CODES.map(async (country) => {
      const articleCount = await countSitemapArticles(country);
      const articlePages = Math.max(1, Math.ceil(articleCount / ARTICLES_PER_SITEMAP));

      const locs = [
        absoluteUrl(`/sitemaps/${country}/pages.xml`),
        absoluteUrl(`/sitemaps/${country}/categories.xml`),
        absoluteUrl(`/sitemaps/${country}/tags.xml`),
        absoluteUrl(`/sitemaps/${country}/authors.xml`),
        ...Array.from({ length: articlePages }, (_, index) =>
          absoluteUrl(`/sitemaps/${country}/articles-${index + 1}.xml`),
        ),
        absoluteUrl(`/news-sitemap/${country}`),
      ];

      return locs.map((loc): SitemapIndexEntry => ({ loc, lastmod }));
    }),
  );

  return xmlResponse(buildSitemapIndexXml(countryEntries.flat()));
}

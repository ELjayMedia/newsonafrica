/**
 * Per-country section sitemaps (NOA-112), addressed from the sitemap index
 * (`app/sitemap.xml/route.ts`) as `/sitemaps/{country}/{section}.xml`:
 *
 *   - `pages.xml`        → the country home page
 *   - `categories.xml`   → `/{country}/category/{slug}` (WordPress DAL)
 *   - `tags.xml`         → `/{country}/tag/{slug}` (WordPress DAL)
 *   - `authors.xml`      → `/{country}/author/{slug}` (WordPress DAL)
 *   - `articles-{n}.xml` → `/{country}/article/{slug}` page n (Supabase
 *                          content_index, ARTICLES_PER_SITEMAP per page,
 *                          lastmod from updated/published dates)
 *
 * Unknown countries/sections 404. Upstream failures degrade to an empty
 * urlset (see lib/seo/sitemap-data.ts) so crawlers get valid XML even when
 * WordPress/Supabase are unreachable.
 */
import { isValidCountry } from "@/lib/countries";
import { absoluteUrl } from "@/lib/seo/config";
import {
  listSitemapArticles,
  listSitemapAuthorSlugs,
  listSitemapCategorySlugs,
  listSitemapTagSlugs,
} from "@/lib/seo/sitemap-data";
import { buildUrlsetXml, toLastmod, xmlResponse, type SitemapUrlEntry } from "@/lib/seo/sitemap-xml";

interface RouteContext {
  params: Promise<{ countryCode: string; section: string }>;
}

const ARTICLES_SECTION = /^articles-(\d+)\.xml$/;

function termEntries(country: string, kind: "category" | "tag" | "author", slugs: string[]): SitemapUrlEntry[] {
  return slugs.map((slug) => ({
    loc: absoluteUrl(`/${country}/${kind}/${slug}`),
    changefreq: "daily",
    priority: 0.6,
  }));
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { countryCode, section } = await params;
  const country = countryCode.toLowerCase();

  if (!isValidCountry(country)) {
    return new Response("Not found", { status: 404 });
  }

  let entries: SitemapUrlEntry[];

  const articlesMatch = section.match(ARTICLES_SECTION);
  if (articlesMatch) {
    const page = Number.parseInt(articlesMatch[1] ?? "", 10);
    if (page < 1) return new Response("Not found", { status: 404 });
    const articles = await listSitemapArticles(country, page);
    entries = articles.map((article) => ({
      loc: absoluteUrl(article.path),
      lastmod: toLastmod(article.updatedAt ?? article.publishedAt),
      changefreq: "weekly",
      priority: 0.7,
    }));
  } else if (section === "pages.xml") {
    entries = [{ loc: absoluteUrl(`/${country}`), changefreq: "hourly", priority: 1.0 }];
  } else if (section === "categories.xml") {
    entries = termEntries(country, "category", await listSitemapCategorySlugs(country));
  } else if (section === "tags.xml") {
    entries = termEntries(country, "tag", await listSitemapTagSlugs(country));
  } else if (section === "authors.xml") {
    entries = termEntries(country, "author", await listSitemapAuthorSlugs(country));
  } else {
    return new Response("Not found", { status: 404 });
  }

  return xmlResponse(buildUrlsetXml(entries));
}

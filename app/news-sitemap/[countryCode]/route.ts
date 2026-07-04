/**
 * Google News sitemap per country edition (NOA-113), served at
 * `/news-sitemap/{country}` and referenced from the sitemap index
 * (NOA-112). Mirrors `legacy/app/news-sitemap/[countryCode]/route.ts`.
 *
 * Per the News sitemap spec: only articles published in the last 48 hours
 * (`NEWS_SITEMAP_WINDOW_MS`), max 1,000 URLs, with `<news:publication>`
 * name/language, `<news:publication_date>` and `<news:title>`; category
 * names become `<news:keywords>`. Articles come from the Supabase
 * `content_index` and degrade to an empty (still valid) urlset when it is
 * unreachable.
 */
import { isValidCountry } from "@/lib/countries";
import { absoluteUrl, PUBLICATION_LANGUAGE, PUBLICATION_NAME } from "@/lib/seo/config";
import { listRecentNewsArticles } from "@/lib/seo/sitemap-data";
import { buildNewsSitemapXml, xmlResponse } from "@/lib/seo/sitemap-xml";

interface RouteContext {
  params: Promise<{ countryCode: string }>;
}

// The 48h window is relative to "now" — always render per request and let
// the CDN cache via the Cache-Control header from `xmlResponse`.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { countryCode } = await params;
  const country = countryCode.toLowerCase();

  if (!isValidCountry(country)) {
    return new Response("Not found", { status: 404 });
  }

  const articles = await listRecentNewsArticles(country);

  const xml = buildNewsSitemapXml(
    articles.map((article) => ({
      loc: absoluteUrl(article.path),
      title: article.title,
      publicationDate: article.publishedAt,
      keywords: article.categories,
    })),
    {
      // Must exactly match the publication name in Google Publisher Center;
      // country editions share the single "News on Africa" publication.
      name: PUBLICATION_NAME,
      language: PUBLICATION_LANGUAGE,
    },
  );

  return xmlResponse(xml);
}

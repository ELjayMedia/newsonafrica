/**
 * Pure schema.org JSON-LD builders (NOA-114).
 *
 * Same layering as `lib/seo/sitemap-xml.ts`: no I/O and no server-only
 * imports so every builder is unit-testable (`lib/seo/json-ld.test.ts`).
 * The React components in `components/seo/json-ld.tsx` feed these plain
 * objects into a `<script type="application/ld+json">` tag.
 *
 * Modeled on the legacy `legacy/components/{ArticleJsonLd,SchemaOrg}.tsx`
 * but rewritten against this rebuild's DAL types and `lib/seo/config`.
 */
import { absoluteUrl, getBaseUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/config";

/** Publisher logo used in NewsArticle/Organization schema (512px PNG per Google's guidance). */
export const PUBLISHER_LOGO_PATH = "/icons/icon-512.png";
const PUBLISHER_LOGO_SIZE = 512;

/**
 * Serialize JSON-LD for embedding in a `<script>` tag. `JSON.stringify`
 * alone is unsafe there: a `</script>` inside a CMS title would close the
 * tag early (XSS). Escape HTML-significant characters as JSON unicode
 * escapes — still valid JSON, inert as HTML.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function publisherNode() {
  return {
    "@type": "NewsMediaOrganization",
    "@id": `${getBaseUrl()}/#organization`,
    name: SITE_NAME,
    url: getBaseUrl(),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(PUBLISHER_LOGO_PATH),
      width: PUBLISHER_LOGO_SIZE,
      height: PUBLISHER_LOGO_SIZE,
    },
  };
}

/** Site-wide Organization (NewsMediaOrganization) node, rendered once in the root layout. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    ...publisherNode(),
    description: SITE_DESCRIPTION,
  };
}

/** Site-wide WebSite node with a SearchAction pointing at `/search`, rendered once in the root layout. */
export function webSiteJsonLd() {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: baseUrl,
    publisher: { "@id": `${baseUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface NewsArticleJsonLdInput {
  /** Site-relative article path (e.g. "/sz/article/some-slug"). */
  path: string;
  title: string;
  description?: string;
  /** ISO 8601 datetimes. */
  publishedAt: string;
  updatedAt?: string;
  imageUrl?: string;
  author?: {
    name: string;
    /** Site-relative author-page path. */
    path?: string;
  };
  /** Primary category name → `articleSection`. */
  section?: string;
  /** Tag names → `keywords`. */
  keywords?: string[];
}

/** NewsArticle node for an article page. */
export function newsArticleJsonLd(input: NewsArticleJsonLdInput) {
  const url = absoluteUrl(input.path);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: input.publishedAt,
    dateModified: input.updatedAt || input.publishedAt,
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
    ...(input.author
      ? {
          author: {
            "@type": "Person",
            name: input.author.name,
            ...(input.author.path ? { url: absoluteUrl(input.author.path) } : {}),
          },
        }
      : {}),
    ...(input.section ? { articleSection: input.section } : {}),
    ...(input.keywords && input.keywords.length > 0 ? { keywords: input.keywords.join(", ") } : {}),
    publisher: publisherNode(),
    isAccessibleForFree: true,
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path. Omit on the final crumb (the current page). */
  path?: string;
}

/** BreadcrumbList node for article/category pages. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

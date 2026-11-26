/**
 * JSON-LD structured-data components (NOA-114).
 *
 * Server components that render schema.org nodes into
 * `<script type="application/ld+json">` tags. All schema shapes come from
 * the pure builders in `lib/seo/json-ld.ts` (unit-tested there);
 * serialization goes through `serializeJsonLd`, which escapes
 * HTML-significant characters so CMS-supplied strings can't break out of
 * the script tag.
 *
 * Usage:
 * - `<SiteJsonLd />` once in the root layout (WebSite + Organization).
 * - `<NewsArticleJsonLd post={post} />` on article pages.
 * - `<BreadcrumbJsonLd items={...} />` on article/category pages.
 */
import { getArticleUrl } from "@/lib/content-sync/article-url";
import type { Post } from "@/lib/dal/types";
import {
  breadcrumbJsonLd,
  newsArticleJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  webSiteJsonLd,
  type BreadcrumbItem,
} from "@/lib/seo/json-ld";

const CURATION_TAGS = new Set(["fp", "ft"]);

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Safe: serializeJsonLd escapes <, > and & as JSON unicode escapes.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

/** WebSite + Organization nodes — render once in the root layout. */
export function SiteJsonLd() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />
    </>
  );
}

/** NewsArticle node derived from a DAL post — render on article pages. */
export function NewsArticleJsonLd({ post }: { post: Post }) {
  return (
    <JsonLd
      data={newsArticleJsonLd({
        path: getArticleUrl(post.country, post.slug),
        title: post.title,
        description: post.excerpt || undefined,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt || undefined,
        imageUrl: post.featuredImage?.url,
        author: post.author
          ? { name: post.author.name, path: `/${post.country}/author/${post.author.slug}` }
          : undefined,
        section: post.categories[0]?.name,
        // fp / ft are curation tags, not topics: keep them out of keywords.
        keywords: post.tags.filter((tag) => !CURATION_TAGS.has(tag.slug)).map((tag) => tag.name),
      })}
    />
  );
}

/** BreadcrumbList node — render on article/category pages. */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return <JsonLd data={breadcrumbJsonLd(items)} />;
}

/**
 * Pure mapping functions: raw WordPress REST shapes -> normalized DAL types
 * (NOA-86). Kept dependency-free (no fetching) so they're easy to unit test.
 */
import { decodeHtmlEntities, stripHtml } from "@/lib/wordpress/html";
import type { CountryCode } from "@/lib/wordpress/countries";
import type {
  WPRestAuthor,
  WPRestCategory,
  WPRestPost,
  WPRestTag,
  WPRestTerm,
} from "@/lib/wordpress/types";
import type {
  Author,
  AuthorSummary,
  Category,
  CategorySummary,
  Post,
  PostSummary,
  Tag,
  TagSummary,
} from "@/lib/dal/types";

function pickAvatarUrl(avatarUrls?: Record<string, string>): string | undefined {
  if (!avatarUrls) return undefined;
  // Prefer the largest available size.
  const sizes = Object.keys(avatarUrls)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);
  const largest = sizes[0];
  return largest !== undefined ? avatarUrls[String(largest)] : Object.values(avatarUrls)[0];
}

export function mapAuthor(raw: WPRestAuthor): Author {
  return {
    id: raw.id,
    name: decodeHtmlEntities(raw.name ?? ""),
    slug: raw.slug ?? "",
    bio: stripHtml(raw.description ?? ""),
    avatarUrl: pickAvatarUrl(raw.avatar_urls),
  };
}

function mapAuthorSummary(raw: WPRestAuthor): AuthorSummary {
  return {
    id: raw.id,
    name: decodeHtmlEntities(raw.name ?? ""),
    slug: raw.slug ?? "",
    avatarUrl: pickAvatarUrl(raw.avatar_urls),
  };
}

export function mapCategory(raw: WPRestCategory): Category {
  return {
    id: raw.id,
    name: decodeHtmlEntities(raw.name ?? ""),
    slug: raw.slug ?? "",
    description: stripHtml(raw.description ?? ""),
    postCount: raw.count ?? 0,
  };
}

export function mapTag(raw: WPRestTag): Tag {
  return {
    id: raw.id,
    name: decodeHtmlEntities(raw.name ?? ""),
    slug: raw.slug ?? "",
    postCount: raw.count ?? 0,
  };
}

function mapTermSummary(term: WPRestTerm): CategorySummary | TagSummary {
  return { id: term.id, name: decodeHtmlEntities(term.name ?? ""), slug: term.slug ?? "" };
}

function extractEmbeddedTerms(post: WPRestPost, taxonomy: string): CategorySummary[] {
  const groups = post._embedded?.["wp:term"];
  if (!groups) return [];
  return groups.flat().filter((term) => term.taxonomy === taxonomy).map(mapTermSummary);
}

function extractFeaturedImage(post: WPRestPost): Post["featuredImage"] {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (!media?.source_url) return null;
  return {
    url: media.source_url,
    alt: media.alt_text ?? "",
    width: media.media_details?.width,
    height: media.media_details?.height,
  };
}

function extractAuthor(post: WPRestPost): AuthorSummary | null {
  const author = post._embedded?.author?.[0];
  return author ? mapAuthorSummary(author) : null;
}

/**
 * Map a WordPress REST post (ideally fetched with `_embed=1`) into the
 * normalized domain `Post`. When categories/tags weren't embedded, they'll
 * fall back to empty arrays — the DAL always requests `_embed=1` for post
 * reads to avoid this.
 */
export function mapPost(raw: WPRestPost, country: CountryCode | string): Post {
  return {
    id: raw.id,
    slug: raw.slug ?? "",
    country: country as CountryCode,
    title: decodeHtmlEntities(raw.title?.rendered ?? ""),
    excerpt: stripHtml(raw.excerpt?.rendered ?? ""),
    content: raw.content?.rendered ?? "",
    status: raw.status ?? "publish",
    publishedAt: raw.date ?? "",
    updatedAt: raw.modified ?? raw.date ?? "",
    featuredImage: extractFeaturedImage(raw),
    categories: extractEmbeddedTerms(raw, "category"),
    tags: extractEmbeddedTerms(raw, "post_tag"),
    author: extractAuthor(raw),
  };
}

export function mapPostSummary(raw: WPRestPost, country: CountryCode | string): PostSummary {
  const post = mapPost(raw, country);
  return {
    id: post.id,
    slug: post.slug,
    country: post.country,
    title: post.title,
    excerpt: post.excerpt,
    status: post.status,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    featuredImage: post.featuredImage,
    categories: post.categories,
    tags: post.tags,
    author: post.author,
  };
}

/**
 * Pure mapping functions: raw WPGraphQL node shapes -> normalized DAL types
 * (NOA-86). Kept dependency-free (no fetching) so they're easy to unit test.
 *
 * Domain IDs are WordPress database IDs (`databaseId`). When a node omits it
 * (older WPGraphQL responses), we recover it from the base64 Relay global id
 * (`base64("post:123")` -> `123`).
 */
import { decodeHtmlEntities, stripHtml } from "@/lib/wordpress/html";
import type { CountryCode } from "@/lib/wordpress/countries";
import type {
  WPGraphQLAuthorNode,
  WPGraphQLPostNode,
  WPGraphQLTermNode,
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

/** Recover a numeric WordPress DB id from `databaseId` or a base64 Relay id. */
function resolveDatabaseId(node: { databaseId?: number | null; id?: string | null }): number {
  if (typeof node.databaseId === "number" && Number.isFinite(node.databaseId)) {
    return node.databaseId;
  }
  if (typeof node.id === "string" && node.id.length > 0) {
    try {
      const decoded = Buffer.from(node.id, "base64").toString("utf8");
      const parts = decoded.split(":");
      const parsed = Number(parts[parts.length - 1]);
      if (Number.isFinite(parsed)) return parsed;
    } catch {
      /* fall through */
    }
  }
  return 0;
}

export function mapAuthor(node: WPGraphQLAuthorNode): Author {
  return {
    id: resolveDatabaseId(node),
    name: decodeHtmlEntities(node.name ?? ""),
    slug: node.slug ?? "",
    bio: stripHtml(node.description ?? ""),
    avatarUrl: node.avatar?.url ?? undefined,
  };
}

function mapAuthorSummary(node: WPGraphQLAuthorNode): AuthorSummary {
  return {
    id: resolveDatabaseId(node),
    name: decodeHtmlEntities(node.name ?? ""),
    slug: node.slug ?? "",
    avatarUrl: node.avatar?.url ?? undefined,
  };
}

export function mapCategory(node: WPGraphQLTermNode): Category {
  return {
    id: resolveDatabaseId(node),
    name: decodeHtmlEntities(node.name ?? ""),
    slug: node.slug ?? "",
    description: stripHtml(node.description ?? ""),
    postCount: node.count ?? 0,
  };
}

export function mapTag(node: WPGraphQLTermNode): Tag {
  return {
    id: resolveDatabaseId(node),
    name: decodeHtmlEntities(node.name ?? ""),
    slug: node.slug ?? "",
    postCount: node.count ?? 0,
  };
}

function mapTermSummary(node: WPGraphQLTermNode): CategorySummary | TagSummary {
  return { id: resolveDatabaseId(node), name: decodeHtmlEntities(node.name ?? ""), slug: node.slug ?? "" };
}

function mapTermSummaries(
  connection: { nodes?: Array<WPGraphQLTermNode | null> | null } | null | undefined,
): CategorySummary[] {
  return (connection?.nodes ?? [])
    .filter((node): node is WPGraphQLTermNode => Boolean(node?.slug))
    .map(mapTermSummary);
}

function mapFeaturedImage(node: WPGraphQLPostNode): Post["featuredImage"] {
  const image = node.featuredImage?.node;
  if (!image?.sourceUrl) return null;
  return {
    url: image.sourceUrl,
    alt: image.altText ?? "",
    width: image.mediaDetails?.width ?? undefined,
    height: image.mediaDetails?.height ?? undefined,
  };
}

/**
 * Map a WPGraphQL post node into the normalized domain `Post`. `content` is
 * only present on detail reads (`POST_DETAIL_FIELDS`); summary reads leave it
 * empty. Titles are entity-decoded and excerpts stripped to plain text, matching
 * how the app renders them.
 */
export function mapPost(node: WPGraphQLPostNode, country: CountryCode | string): Post {
  return {
    id: resolveDatabaseId(node),
    slug: node.slug ?? "",
    country: country as CountryCode,
    title: decodeHtmlEntities(node.title ?? ""),
    excerpt: stripHtml(node.excerpt ?? ""),
    content: node.content ?? "",
    status: node.status ?? "publish",
    publishedAt: node.date ?? "",
    updatedAt: node.modified ?? node.date ?? "",
    featuredImage: mapFeaturedImage(node),
    categories: mapTermSummaries(node.categories),
    tags: mapTermSummaries(node.tags),
    author: node.author?.node ? mapAuthorSummary(node.author.node) : null,
  };
}

export function mapPostSummary(node: WPGraphQLPostNode, country: CountryCode | string): PostSummary {
  const post = mapPost(node, country);
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

/**
 * Post data access (NOA-86): pagination + country/category/tag/author
 * filtering over WPGraphQL. Listing uses the offset-pagination plugin so the
 * DAL keeps page-number semantics with real totals; the summary query embeds
 * featured image, terms and author so `mapPostSummary` needs no follow-up reads.
 */
import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import { SUPPORTED_COUNTRY_CODES } from "@/lib/countries";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressGraphQL, unwrapGraphQL } from "@/lib/wordpress/graphql-client";
import {
  POSTS_LIST_QUERY,
  POSTS_WITH_CONTENT_QUERY,
  POST_BY_DATABASE_ID_QUERY,
  POST_BY_SLUG_QUERY,
  RELATED_BY_CATEGORIES_QUERY,
  RELATED_BY_TAGS_QUERY,
} from "@/lib/wordpress/queries";
import type { WPGraphQLConnection, WPGraphQLPostNode } from "@/lib/wordpress/types";
import { mapPost, mapPostSummary } from "@/lib/dal/mappers";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { PaginatedResult, Post, PostListParams, PostSummary } from "@/lib/dal/types";

const REVALIDATE_SECONDS = 60;

type PostsConnectionResult = { posts: WPGraphQLConnection<WPGraphQLPostNode> | null };
type PostResult = { post: WPGraphQLPostNode | null };

function nonNullNodes(connection: WPGraphQLConnection<WPGraphQLPostNode> | null | undefined): WPGraphQLPostNode[] {
  return (connection?.nodes ?? []).filter((node): node is WPGraphQLPostNode => Boolean(node));
}

/**
 * List posts for a country, optionally filtered by category/tag/author slug and
 * paginated. Slugs are passed straight to WPGraphQL's `where` filters
 * (`categoryName`, `tagSlugIn`, `authorName`), so an unknown slug simply yields
 * an empty page — no separate term/user lookup round-trip is needed.
 */
export async function listPosts(params: PostListParams): Promise<PaginatedResult<PostSummary>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);
  const { country } = params;

  const tags = [cacheTags.posts(country)];
  if (params.categorySlug) tags.push(cacheTags.category(country, params.categorySlug));
  if (params.tagSlug) tags.push(cacheTags.tag(country, params.tagSlug));
  if (params.authorSlug) tags.push(cacheTags.author(country, params.authorSlug));

  const result = await fetchWordPressGraphQL<PostsConnectionResult>(
    country,
    POSTS_LIST_QUERY,
    {
      size: perPage,
      offset: (page - 1) * perPage,
      categoryName: params.categorySlug ?? null,
      tagSlugs: params.tagSlug ? [params.tagSlug] : null,
      authorName: params.authorSlug ?? null,
      search: params.search ?? null,
    },
    { tags, revalidate: REVALIDATE_SECONDS, operationName: "PostsList" },
  );

  const data = unwrapGraphQL(result);
  const nodes = nonNullNodes(data.posts);
  const total = data.posts?.pageInfo?.offsetPagination?.total ?? nodes.length;

  return buildPaginatedResult(
    nodes.map((node) => mapPostSummary(node, country)),
    page,
    perPage,
    { total, totalPages: 0 },
  );
}

/**
 * Related posts for an article, matched by shared taxonomy (NOA port of the
 * legacy relevance logic): categories first, then supplemented by shared tags,
 * de-duplicated and excluding the article itself. Falls back to an empty list
 * when the post has no terms.
 */
export async function getRelatedPosts(
  country: CountryCode | string,
  post: Pick<Post, "id" | "categories" | "tags">,
  limit = 3,
): Promise<PostSummary[]> {
  const categoryIds = post.categories.map((category) => category.id).filter((id) => Number.isFinite(id) && id > 0);
  const tagSlugs = post.tags.map((tag) => tag.slug).filter((slug): slug is string => Boolean(slug));

  if (categoryIds.length === 0 && tagSlugs.length === 0) return [];

  const seen = new Set<number>([post.id]);
  const related: PostSummary[] = [];

  const collect = async (nodes: WPGraphQLPostNode[]) => {
    for (const node of nodes) {
      const summary = mapPostSummary(node, country);
      if (seen.has(summary.id)) continue;
      seen.add(summary.id);
      related.push(summary);
      if (related.length >= limit) break;
    }
  };

  if (categoryIds.length > 0) {
    const result = await fetchWordPressGraphQL<PostsConnectionResult>(
      country,
      RELATED_BY_CATEGORIES_QUERY,
      { catIds: categoryIds, exclude: post.id, first: limit + 4 },
      { tags: [cacheTags.posts(country)], revalidate: REVALIDATE_SECONDS, operationName: "RelatedByCategories" },
    );
    await collect(nonNullNodes(unwrapGraphQL(result).posts));
  }

  if (related.length < limit && tagSlugs.length > 0) {
    const result = await fetchWordPressGraphQL<PostsConnectionResult>(
      country,
      RELATED_BY_TAGS_QUERY,
      { tagSlugs, exclude: post.id, first: limit + 4 },
      { tags: [cacheTags.posts(country)], revalidate: REVALIDATE_SECONDS, operationName: "RelatedByTags" },
    );
    await collect(nonNullNodes(unwrapGraphQL(result).posts));
  }

  return related.slice(0, limit);
}

export async function getPostBySlug(country: CountryCode | string, slug: string): Promise<Post | null> {
  const result = await fetchWordPressGraphQL<PostResult>(
    country,
    POST_BY_SLUG_QUERY,
    { slug },
    {
      tags: [cacheTags.postSlug(country, slug), cacheTags.posts(country)],
      revalidate: REVALIDATE_SECONDS,
      operationName: "PostBySlug",
    },
  );

  const node = unwrapGraphQL(result).post;
  return node ? mapPost(node, country) : null;
}

/**
 * Resolve an article by slug, falling back across editions (NOA port of the
 * legacy cross-country fallback). Tries the requested edition first; on a miss,
 * looks the slug up in the other editions in parallel and returns the first
 * match with the edition it was found in. Returns null only when no edition has
 * the slug.
 */
export async function getPostBySlugWithFallback(
  country: CountryCode | string,
  slug: string,
): Promise<{ post: Post; sourceCountry: CountryCode } | null> {
  const primary = await getPostBySlug(country, slug).catch(() => null);
  if (primary) return { post: primary, sourceCountry: primary.country };

  const others = SUPPORTED_COUNTRY_CODES.filter((code) => code !== country);
  const results = await Promise.all(
    others.map(async (code) => ({ code, post: await getPostBySlug(code, slug).catch(() => null) })),
  );

  const hit = results.find((result) => result.post !== null);
  return hit && hit.post ? { post: hit.post, sourceCountry: hit.code } : null;
}

export async function getPostById(country: CountryCode | string, id: number): Promise<Post | null> {
  const result = await fetchWordPressGraphQL<PostResult>(
    country,
    POST_BY_DATABASE_ID_QUERY,
    { id: String(id) },
    { tags: [cacheTags.post(country, id), cacheTags.posts(country)], revalidate: REVALIDATE_SECONDS, operationName: "PostByDatabaseId" },
  );

  const node = unwrapGraphQL(result).post;
  return node ? mapPost(node, country) : null;
}

/**
 * Page through a country's posts with body content, for the content-sync
 * backfill/index (NOA-87). Returns fully-mapped domain `Post`s plus pagination
 * so the sync routine can decide whether more pages remain.
 */
export async function listPostsForSync(
  country: CountryCode | string,
  { page = 1, perPage = 50 }: { page?: number; perPage?: number } = {},
): Promise<{ posts: Post[]; total: number; totalPages: number; hasNextPage: boolean }> {
  const normalizedPage = normalizePage(page);
  const normalizedPerPage = normalizePerPage(perPage);

  const result = await fetchWordPressGraphQL<PostsConnectionResult>(
    country,
    POSTS_WITH_CONTENT_QUERY,
    { size: normalizedPerPage, offset: (normalizedPage - 1) * normalizedPerPage },
    // Backfill/sync always wants the freshest content — never served from cache.
    { revalidate: 0, operationName: "PostsWithContent" },
  );

  const data = unwrapGraphQL(result);
  const nodes = nonNullNodes(data.posts);
  const total = data.posts?.pageInfo?.offsetPagination?.total ?? nodes.length;
  const totalPages = total > 0 ? Math.ceil(total / normalizedPerPage) : nodes.length > 0 ? 1 : 0;

  return {
    posts: nodes.map((node) => mapPost(node, country)),
    total,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
  };
}
